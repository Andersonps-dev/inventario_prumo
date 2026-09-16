import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtualizarEmpresa, useCriarEmpresa, useEmpresas } from '../../api/hooks';
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
import { useOrdenacao } from '../../app/useOrdenacao';
import type { Empresa } from '../../api/types';

export function EmpresasPage() {
  const { selecionarEmpresa } = useAuth();
  const navigate = useNavigate();
  const { data: empresas, isLoading } = useEmpresas();
  const criar = useCriarEmpresa();
  const atualizar = useAtualizarEmpresa();
  const [nome, setNome] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [inativando, setInativando] = useState<Empresa | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState('');

  const empresasFiltradas = empresas?.filter((e) => {
    if (filtroSituacao === 'ativo' && !e.ativo) return false;
    if (filtroSituacao === 'inativo' && e.ativo) return false;
    if (busca && !e.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });
  const { linhasOrdenadas: empresasOrdenadas, ordenacao, alternar } = useOrdenacao(empresasFiltradas, {
    nome: (e) => e.nome,
    usuarios: (e) => e._count?.usuarios ?? 0,
    produtos: (e) => e._count?.produtos ?? 0,
    depositos: (e) => e._count?.depositos ?? 0,
    escopos: (e) => e._count?.escopos ?? 0,
    ativo: (e) => e.ativo,
  });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nome.trim()) return;
    setErro(null);
    try {
      await criar.mutateAsync(nome.trim());
      setNome('');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar a empresa.');
    }
  };

  const iniciarEdicao = (empresa: Empresa) => {
    setEditandoId(empresa.id);
    setNomeEditado(empresa.nome);
    setErro(null);
  };

  const salvarEdicao = async (id: number) => {
    if (!nomeEditado.trim()) return;
    setErro(null);
    try {
      await atualizar.mutateAsync({ id, dto: { nome: nomeEditado.trim() } });
      setEditandoId(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar a empresa.');
    }
  };

  const executarAlternarAtivo = async (empresa: Empresa) => {
    setErro(null);
    try {
      await atualizar.mutateAsync({ id: empresa.id, dto: { ativo: !empresa.ativo } });
      setInativando(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível alterar a situação da empresa.');
    }
  };

  const alternarAtivo = (empresa: Empresa) => {
    if (empresa.ativo) setInativando(empresa);
    else executarAlternarAtivo(empresa);
  };

  const entrarNaEmpresa = (empresa: Empresa) => {
    selecionarEmpresa({ id: empresa.id, nome: empresa.nome });
    navigate('/');
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Empresas</h1>
        <p className="text-sm text-muted">Cada empresa é isolada — catálogo, estoque e usuários próprios.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
        <Input placeholder="Nome da nova empresa" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full sm:w-72" />
        <Button type="submit" variante="primaria" disabled={criar.isPending}>
          Adicionar
        </Button>
      </form>

      {erro && <div className="text-sm text-danger">{erro}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Buscar por nome…" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64" />
        <Select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)} className="w-48">
          <option value="">Todas as situações</option>
          <option value="ativo">Só ativas</option>
          <option value="inativo">Só inativas</option>
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
              <Th sortKey="usuarios" ordenacao={ordenacao} onSort={alternar}>
                Usuários
              </Th>
              <Th sortKey="produtos" ordenacao={ordenacao} onSort={alternar}>
                Produtos
              </Th>
              <Th sortKey="depositos" ordenacao={ordenacao} onSort={alternar}>
                Depósitos
              </Th>
              <Th sortKey="escopos" ordenacao={ordenacao} onSort={alternar}>
                Escopos
              </Th>
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
            {empresasOrdenadas?.map((e) => (
              <tr key={e.id} className={!e.ativo ? 'opacity-50' : ''}>
                <Td>
                  {editandoId === e.id ? (
                    <Input
                      autoFocus
                      value={nomeEditado}
                      onChange={(ev) => setNomeEditado(ev.target.value)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') salvarEdicao(e.id);
                        if (ev.key === 'Escape') setEditandoId(null);
                      }}
                      className="w-56"
                    />
                  ) : (
                    e.nome
                  )}
                </Td>
                <Td>{e._count?.usuarios ?? 0}</Td>
                <Td>{e._count?.produtos ?? 0}</Td>
                <Td>{e._count?.depositos ?? 0}</Td>
                <Td>{e._count?.escopos ?? 0}</Td>
                <Td>
                  <Badge tom={e.ativo ? 'conforme' : 'divergente'}>{e.ativo ? 'Ativa' : 'Inativa'}</Badge>
                </Td>
                <Td>
                  <RowActions>
                    {editandoId === e.id ? (
                      <>
                        <RowAction onClick={() => salvarEdicao(e.id)} disabled={atualizar.isPending}>
                          Salvar
                        </RowAction>
                        <RowAction tom="neutro" onClick={() => setEditandoId(null)}>
                          Cancelar
                        </RowAction>
                      </>
                    ) : (
                      <>
                        <RowAction onClick={() => entrarNaEmpresa(e)}>Entrar</RowAction>
                        <RowAction onClick={() => iniciarEdicao(e)}>Editar</RowAction>
                        <RowAction tom="perigo" onClick={() => alternarAtivo(e)}>
                          {e.ativo ? 'Inativar' : 'Reativar'}
                        </RowAction>
                      </>
                    )}
                  </RowActions>
                </Td>
              </tr>
            ))}
            {empresasOrdenadas && empresasOrdenadas.length === 0 && (
              <tr>
                <Td className="text-muted">Nenhuma empresa encontrada.</Td>
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
              <Card key={i} padding="p-3" className="h-24 animate-pulse" />
            ))}
          </div>
        )}
        {empresasOrdenadas?.map((e) => (
          <Card key={e.id} padding="p-3" className={!e.ativo ? 'opacity-60' : ''}>
            <div className="flex items-start justify-between gap-2">
              {editandoId === e.id ? (
                <Input
                  autoFocus
                  value={nomeEditado}
                  onChange={(ev) => setNomeEditado(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') salvarEdicao(e.id);
                    if (ev.key === 'Escape') setEditandoId(null);
                  }}
                  className="min-w-0 flex-1"
                />
              ) : (
                <div className="truncate text-sm font-medium text-ink">{e.nome}</div>
              )}
              <Badge tom={e.ativo ? 'conforme' : 'divergente'}>{e.ativo ? 'Ativa' : 'Inativa'}</Badge>
            </div>
            <div className="mt-2.5 grid grid-cols-4 gap-2 text-center">
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Usuários</div>
                <div className="text-sm font-semibold text-ink">{e._count?.usuarios ?? 0}</div>
              </div>
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Produtos</div>
                <div className="text-sm font-semibold text-ink">{e._count?.produtos ?? 0}</div>
              </div>
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Depósitos</div>
                <div className="text-sm font-semibold text-ink">{e._count?.depositos ?? 0}</div>
              </div>
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Escopos</div>
                <div className="text-sm font-semibold text-ink">{e._count?.escopos ?? 0}</div>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <RowActions>
                {editandoId === e.id ? (
                  <>
                    <RowAction onClick={() => salvarEdicao(e.id)} disabled={atualizar.isPending}>
                      Salvar
                    </RowAction>
                    <RowAction tom="neutro" onClick={() => setEditandoId(null)}>
                      Cancelar
                    </RowAction>
                  </>
                ) : (
                  <>
                    <RowAction onClick={() => entrarNaEmpresa(e)}>Entrar</RowAction>
                    <RowAction onClick={() => iniciarEdicao(e)}>Editar</RowAction>
                    <RowAction tom="perigo" onClick={() => alternarAtivo(e)}>
                      {e.ativo ? 'Inativar' : 'Reativar'}
                    </RowAction>
                  </>
                )}
              </RowActions>
            </div>
          </Card>
        ))}
        {empresasOrdenadas && empresasOrdenadas.length === 0 && <EmptyState mensagem="Nenhuma empresa encontrada." />}
      </div>

      {inativando && (
        <ConfirmDialog
          titulo="Inativar empresa?"
          descricao={`"${inativando.nome}" deixa de permitir login dos seus usuários imediatamente. O histórico é preservado e pode ser reativada a qualquer momento.`}
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
