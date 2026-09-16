import { useState } from 'react';
import { useAtualizarUsuarioAdmin, useUsuariosAdmin } from '../../api/hooks';
import { useAuth } from '../../app/AuthContext';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { RowActions, RowAction } from '../../components/RowActions';
import { Input, Select } from '../../components/Input';
import { ApiError } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { UsuarioFormModal } from './UsuarioFormModal';
import { useOrdenacao } from '../../app/useOrdenacao';
import type { UsuarioAdmin } from '../../api/types';

export function UsuariosPage() {
  const { usuario: ator, empresaSelecionada } = useAuth();
  const { data: usuarios, isLoading } = useUsuariosAdmin();
  const atualizar = useAtualizarUsuarioAdmin();
  const [editando, setEditando] = useState<UsuarioAdmin | null | 'novo'>(null);
  const [inativando, setInativando] = useState<UsuarioAdmin | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroPapel, setFiltroPapel] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState('');

  const modoGlobal = ator?.papel === 'SUPER_ADMIN' && !empresaSelecionada;

  const usuariosFiltrados = usuarios?.filter((u) => {
    if (filtroPapel && u.papel !== filtroPapel) return false;
    if (filtroSituacao === 'ativo' && !u.ativo) return false;
    if (filtroSituacao === 'inativo' && u.ativo) return false;
    if (busca) {
      const termo = busca.toLowerCase();
      if (!u.nome.toLowerCase().includes(termo) && !u.email.toLowerCase().includes(termo)) return false;
    }
    return true;
  });
  const { linhasOrdenadas: usuariosOrdenados, ordenacao, alternar } = useOrdenacao(usuariosFiltrados, {
    nome: (u) => u.nome,
    email: (u) => u.email,
    papel: (u) => u.papel,
    empresa: (u) => u.empresa?.nome,
    ativo: (u) => u.ativo,
  });

  const executarAlternarAtivo = async (usuario: UsuarioAdmin) => {
    setErro(null);
    try {
      await atualizar.mutateAsync({ id: usuario.id, dto: { ativo: !usuario.ativo } });
      setInativando(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível alterar a situação do usuário.');
    }
  };

  const alternarAtivo = (usuario: UsuarioAdmin) => {
    if (usuario.ativo) setInativando(usuario);
    else executarAlternarAtivo(usuario);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Usuários</h1>
          <p className="text-sm text-muted">
            {modoGlobal ? 'Todas as empresas — entre numa empresa para criar usuários nela.' : 'Usuários com acesso a esta empresa.'}
          </p>
        </div>
        {!modoGlobal && (
          <Button variante="primaria" onClick={() => setEditando('novo')}>
            + Novo usuário
          </Button>
        )}
      </div>

      {erro && <div className="text-sm text-danger">{erro}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Buscar por nome ou email…" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64" />
        <Select value={filtroPapel} onChange={(e) => setFiltroPapel(e.target.value)} className="w-48">
          <option value="">Todos os papéis</option>
          <option value="CONTADOR">Contador</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="ADMIN">Admin</option>
          {modoGlobal && <option value="SUPER_ADMIN">Super admin</option>}
        </Select>
        <Select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)} className="w-48">
          <option value="">Todas as situações</option>
          <option value="ativo">Só ativos</option>
          <option value="inativo">Só inativos</option>
        </Select>
      </div>

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th sortKey="nome" ordenacao={ordenacao} onSort={alternar}>
                Nome
              </Th>
              <Th sortKey="email" ordenacao={ordenacao} onSort={alternar}>
                Email
              </Th>
              <Th sortKey="papel" ordenacao={ordenacao} onSort={alternar}>
                Papel
              </Th>
              {modoGlobal && (
                <Th sortKey="empresa" ordenacao={ordenacao} onSort={alternar}>
                  Empresa
                </Th>
              )}
              <Th sortKey="ativo" ordenacao={ordenacao} onSort={alternar}>
                Situação
              </Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <Td className="text-muted">Carregando…</Td>
              </tr>
            )}
            {usuariosOrdenados?.map((u) => (
              <tr key={u.id} className={!u.ativo ? 'opacity-50' : ''}>
                <Td>{u.nome}</Td>
                <Td className="text-xs text-muted">{u.email}</Td>
                <Td>{u.papel}</Td>
                {modoGlobal && <Td>{u.empresa?.nome ?? '—'}</Td>}
                <Td>
                  <Badge tom={u.ativo ? 'conforme' : 'divergente'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
                </Td>
                <Td>
                  {u.papel !== 'SUPER_ADMIN' && (
                    <RowActions>
                      <RowAction onClick={() => setEditando(u)}>Editar</RowAction>
                      <RowAction tom="perigo" onClick={() => alternarAtivo(u)}>
                        {u.ativo ? 'Inativar' : 'Reativar'}
                      </RowAction>
                    </RowActions>
                  )}
                </Td>
              </tr>
            ))}
            {usuariosOrdenados && usuariosOrdenados.length === 0 && (
              <tr>
                <Td className="text-muted">Nenhum usuário encontrado.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Celular: cards empilhados. */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="p-3" className="h-20 animate-pulse" />
            ))}
          </div>
        )}
        {usuariosOrdenados?.map((u) => (
          <Card key={u.id} padding="p-3" className={!u.ativo ? 'opacity-60' : ''}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink">{u.nome}</div>
                <div className="truncate text-xs text-muted">{u.email}</div>
              </div>
              <Badge tom={u.ativo ? 'conforme' : 'divergente'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <span>{u.papel}</span>
                {modoGlobal && <span>{u.empresa?.nome ?? 'Sem empresa'}</span>}
              </div>
              {u.papel !== 'SUPER_ADMIN' && (
                <RowActions>
                  <RowAction onClick={() => setEditando(u)}>Editar</RowAction>
                  <RowAction tom="perigo" onClick={() => alternarAtivo(u)}>
                    {u.ativo ? 'Inativar' : 'Reativar'}
                  </RowAction>
                </RowActions>
              )}
            </div>
          </Card>
        ))}
        {usuariosOrdenados && usuariosOrdenados.length === 0 && <EmptyState mensagem="Nenhum usuário encontrado." />}
      </div>

      {editando && <UsuarioFormModal usuario={editando === 'novo' ? null : editando} onClose={() => setEditando(null)} />}

      {inativando && (
        <ConfirmDialog
          titulo="Inativar usuário?"
          descricao={`"${inativando.nome}" deixa de conseguir entrar no sistema. O histórico de ações continua preservado.`}
          rotuloConfirmar="Inativar"
          variante="perigo"
          pendente={atualizar.isPending}
          onCancelar={() => setInativando(null)}
          onConfirmar={() => executarAlternarAtivo(inativando)}
        />
      )}
    </div>
  );
}
