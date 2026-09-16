import { useState } from 'react';
import { useAtualizarDeposito, useCriarDeposito, useDepositos } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { RowActions, RowAction } from '../../components/RowActions';
import { Card } from '../../components/Card';
import { Input, Select } from '../../components/Input';
import { ApiError } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useOrdenacao } from '../../app/useOrdenacao';
import type { Deposito } from '../../api/types';

export function DepositosPage() {
  const { data: depositos, isLoading } = useDepositos();
  const criar = useCriarDeposito();
  const atualizar = useAtualizarDeposito();
  const [nome, setNome] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [inativando, setInativando] = useState<Deposito | null>(null);
  const [filtroSituacao, setFiltroSituacao] = useState('');

  const depositosFiltrados = depositos?.filter((d) => {
    if (filtroSituacao === 'ativo') return d.ativo;
    if (filtroSituacao === 'inativo') return !d.ativo;
    return true;
  });
  const { linhasOrdenadas: depositosOrdenados, ordenacao, alternar } = useOrdenacao(depositosFiltrados, {
    nome: (d) => d.nome,
    ativo: (d) => d.ativo,
  });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nome.trim()) return;
    setErro(null);
    try {
      await criar.mutateAsync(nome.trim());
      setNome('');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar o depósito.');
    }
  };

  const iniciarEdicao = (deposito: Deposito) => {
    setEditandoId(deposito.id);
    setNomeEditado(deposito.nome);
    setErro(null);
  };

  const salvarEdicao = async (id: number) => {
    if (!nomeEditado.trim()) return;
    setErro(null);
    try {
      await atualizar.mutateAsync({ id, dto: { nome: nomeEditado.trim() } });
      setEditandoId(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar o depósito.');
    }
  };

  const executarAlternarAtivo = async (deposito: Deposito) => {
    setErro(null);
    try {
      await atualizar.mutateAsync({ id: deposito.id, dto: { ativo: !deposito.ativo } });
      setInativando(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível alterar a situação do depósito.');
    }
  };

  const alternarAtivo = (deposito: Deposito) => {
    if (deposito.ativo) setInativando(deposito);
    else executarAlternarAtivo(deposito);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Depósitos</h1>
        <p className="text-sm text-muted">Endereços, escopos de inventário e movimentos pertencem a um depósito.</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
        <Input placeholder="Nome do novo depósito" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full sm:w-72" />
        <Button type="submit" variante="primaria" disabled={criar.isPending}>
          Adicionar
        </Button>
      </form>

      {erro && <div className="text-sm text-danger">{erro}</div>}

      <Select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)} className="w-48">
        <option value="">Todas as situações</option>
        <option value="ativo">Só ativos</option>
        <option value="inativo">Só inativos</option>
      </Select>

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th sortKey="nome" ordenacao={ordenacao} onSort={alternar}>
                Nome
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
            {depositosOrdenados?.map((d) => (
              <tr key={d.id} className={!d.ativo ? 'opacity-50' : ''}>
                <Td>
                  {editandoId === d.id ? (
                    <Input
                      autoFocus
                      value={nomeEditado}
                      onChange={(ev) => setNomeEditado(ev.target.value)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') salvarEdicao(d.id);
                        if (ev.key === 'Escape') setEditandoId(null);
                      }}
                      className="w-56"
                    />
                  ) : (
                    d.nome
                  )}
                </Td>
                <Td>
                  <Badge tom={d.ativo ? 'conforme' : 'divergente'}>{d.ativo ? 'Ativo' : 'Inativo'}</Badge>
                </Td>
                <Td>
                  <RowActions>
                    {editandoId === d.id ? (
                      <>
                        <RowAction onClick={() => salvarEdicao(d.id)} disabled={atualizar.isPending}>
                          Salvar
                        </RowAction>
                        <RowAction tom="neutro" onClick={() => setEditandoId(null)}>
                          Cancelar
                        </RowAction>
                      </>
                    ) : (
                      <>
                        <RowAction onClick={() => iniciarEdicao(d)}>Editar</RowAction>
                        <RowAction tom="perigo" onClick={() => alternarAtivo(d)}>
                          {d.ativo ? 'Inativar' : 'Reativar'}
                        </RowAction>
                      </>
                    )}
                  </RowActions>
                </Td>
              </tr>
            ))}
            {depositosOrdenados && depositosOrdenados.length === 0 && (
              <tr>
                <Td className="text-muted">Nenhum depósito encontrado.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Celular: cards empilhados. */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && <div className="text-sm text-muted">Carregando…</div>}
        {depositosOrdenados?.map((d) => (
          <Card key={d.id} padding="p-3" className={!d.ativo ? 'opacity-50' : ''}>
            <div className="flex items-center justify-between gap-2">
              {editandoId === d.id ? (
                <Input
                  autoFocus
                  value={nomeEditado}
                  onChange={(ev) => setNomeEditado(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') salvarEdicao(d.id);
                    if (ev.key === 'Escape') setEditandoId(null);
                  }}
                  className="flex-1"
                />
              ) : (
                <span className="truncate text-sm font-medium text-ink">{d.nome}</span>
              )}
              <div className="flex shrink-0 items-center gap-1">
                <Badge tom={d.ativo ? 'conforme' : 'divergente'}>{d.ativo ? 'Ativo' : 'Inativo'}</Badge>
                <RowActions>
                  {editandoId === d.id ? (
                    <>
                      <RowAction onClick={() => salvarEdicao(d.id)} disabled={atualizar.isPending}>
                        Salvar
                      </RowAction>
                      <RowAction tom="neutro" onClick={() => setEditandoId(null)}>
                        Cancelar
                      </RowAction>
                    </>
                  ) : (
                    <>
                      <RowAction onClick={() => iniciarEdicao(d)}>Editar</RowAction>
                      <RowAction tom="perigo" onClick={() => alternarAtivo(d)}>
                        {d.ativo ? 'Inativar' : 'Reativar'}
                      </RowAction>
                    </>
                  )}
                </RowActions>
              </div>
            </div>
          </Card>
        ))}
        {depositosOrdenados && depositosOrdenados.length === 0 && <div className="p-3 text-sm text-muted">Nenhum depósito encontrado.</div>}
      </div>

      {inativando && (
        <ConfirmDialog
          titulo="Inativar depósito?"
          descricao={`"${inativando.nome}" deixa de aparecer nas telas de movimentação e novos inventários. Endereços e histórico já existentes são preservados.`}
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
