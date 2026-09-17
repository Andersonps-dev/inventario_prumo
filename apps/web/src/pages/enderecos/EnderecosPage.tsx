import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAtualizarEndereco, useDepositos, useEnderecos, useExcluirEndereco } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { RowActions, RowAction } from '../../components/RowActions';
import { FiltrosPanel } from '../../components/FiltrosPanel';
import { Input, Select } from '../../components/Input';
import { useAuth } from '../../app/AuthContext';
import { useOrdenacao } from '../../app/useOrdenacao';
import { ApiError } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EnderecoFormModal } from './EnderecoFormModal';
import { GerarFaixaModal } from './GerarFaixaModal';
import type { Endereco } from '../../api/types';

export function EnderecosPage() {
  const { temPapel } = useAuth();
  const { data: depositos } = useDepositos();
  const [depositoId, setDepositoId] = useState<number | undefined>();
  const [busca, setBusca] = useState('');
  const { data: enderecos, isLoading } = useEnderecos({ depositoId, busca: busca || undefined });
  const atualizar = useAtualizarEndereco();
  const excluir = useExcluirEndereco();

  const [editando, setEditando] = useState<Endereco | null | 'novo'>(null);
  const [gerandoFaixa, setGerandoFaixa] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [inativando, setInativando] = useState<Endereco | null>(null);
  const [excluindo, setExcluindo] = useState<Endereco | null>(null);

  const podeGerenciar = temPapel('ADMIN', 'SUPERVISOR');
  const depositoParaGeracao = depositoId ?? depositos?.[0]?.id;

  const { linhasOrdenadas: enderecosOrdenados, ordenacao, alternar } = useOrdenacao(enderecos, {
    codigo: (e) => e.codigo,
    deposito: (e) => e.deposito?.nome,
    setor: (e) => e.setor,
    rua: (e) => e.rua,
    modulo: (e) => e.modulo,
    nivel: (e) => e.nivel,
    vao: (e) => e.vao,
    ativo: (e) => e.ativo,
  });

  const executarAlternarAtivo = async (endereco: Endereco) => {
    setErro(null);
    try {
      await atualizar.mutateAsync({ id: endereco.id, dto: { ativo: !endereco.ativo } });
      setInativando(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível alterar a situação do endereço.');
    }
  };

  const alternarAtivo = (endereco: Endereco) => {
    if (endereco.ativo) setInativando(endereco);
    else executarAlternarAtivo(endereco);
  };

  const executarExclusao = async (endereco: Endereco) => {
    setErro(null);
    try {
      await excluir.mutateAsync(endereco.id);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível excluir o endereço.');
    } finally {
      setExcluindo(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-ink">Endereços</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/enderecos/etiquetas">
            <Button>Etiquetas</Button>
          </Link>
          {podeGerenciar && (
            <>
              <Button disabled={!depositoParaGeracao} onClick={() => setGerandoFaixa(true)}>
                Gerar por faixa
              </Button>
              <Button variante="primaria" onClick={() => setEditando('novo')}>
                + Novo endereço
              </Button>
            </>
          )}
        </div>
      </div>

      <FiltrosPanel ativos={(busca ? 1 : 0) + (depositoId ? 1 : 0)}>
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Buscar por código, setor, rua…" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-72" />
          <Select value={depositoId ?? ''} onChange={(e) => setDepositoId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Todos os depósitos</option>
            {depositos?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </Select>
        </div>
      </FiltrosPanel>

      {erro && <div className="text-sm text-danger">{erro}</div>}

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th sortKey="codigo" ordenacao={ordenacao} onSort={alternar}>
                Código
              </Th>
              <Th sortKey="deposito" ordenacao={ordenacao} onSort={alternar}>
                Depósito
              </Th>
              <Th sortKey="setor" ordenacao={ordenacao} onSort={alternar}>
                Setor
              </Th>
              <Th sortKey="rua" ordenacao={ordenacao} onSort={alternar}>
                Rua
              </Th>
              <Th sortKey="modulo" ordenacao={ordenacao} onSort={alternar}>
                Módulo
              </Th>
              <Th sortKey="nivel" ordenacao={ordenacao} onSort={alternar}>
                Nível
              </Th>
              <Th sortKey="vao" ordenacao={ordenacao} onSort={alternar}>
                Vão
              </Th>
              <Th sortKey="ativo" ordenacao={ordenacao} onSort={alternar}>
                Situação
              </Th>
              {podeGerenciar && <Th></Th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <Td className="text-muted">Carregando…</Td>
              </tr>
            )}
            {enderecosOrdenados?.map((e) => (
              <tr key={e.id} className={!e.ativo ? 'opacity-50' : ''}>
                <Td className="font-mono text-xs">{e.codigo}</Td>
                <Td>{e.deposito?.nome ?? '—'}</Td>
                <Td>{e.setor}</Td>
                <Td>{e.rua}</Td>
                <Td>{e.modulo}</Td>
                <Td>{e.nivel}</Td>
                <Td>{e.vao}</Td>
                <Td>
                  <Badge tom={e.ativo ? 'conforme' : 'divergente'}>{e.ativo ? 'Ativo' : 'Inativo'}</Badge>
                </Td>
                {podeGerenciar && (
                  <Td>
                    <RowActions>
                      <RowAction onClick={() => setEditando(e)}>Editar</RowAction>
                      <RowAction tom="perigo" onClick={() => alternarAtivo(e)}>
                        {e.ativo ? 'Inativar' : 'Reativar'}
                      </RowAction>
                      <RowAction tom="perigo" onClick={() => setExcluindo(e)}>
                        Excluir
                      </RowAction>
                    </RowActions>
                  </Td>
                )}
              </tr>
            ))}
            {enderecos && enderecos.length === 0 && (
              <tr>
                <Td className="text-muted">Nenhum endereço encontrado.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Celular: cards empilhados — sem rolagem lateral pra alcançar as ações. */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && <div className="text-sm text-muted">Carregando…</div>}
        {enderecosOrdenados?.map((e) => (
          <Card key={e.id} padding="p-3" className={!e.ativo ? 'opacity-50' : ''}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-sm font-medium text-ink">{e.codigo}</div>
                <div className="truncate text-xs text-muted">{e.deposito?.nome ?? '—'}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge tom={e.ativo ? 'conforme' : 'divergente'}>{e.ativo ? 'Ativo' : 'Inativo'}</Badge>
                {podeGerenciar && (
                  <RowActions>
                    <RowAction onClick={() => setEditando(e)}>Editar</RowAction>
                    <RowAction tom="perigo" onClick={() => alternarAtivo(e)}>
                      {e.ativo ? 'Inativar' : 'Reativar'}
                    </RowAction>
                    <RowAction tom="perigo" onClick={() => setExcluindo(e)}>
                      Excluir
                    </RowAction>
                  </RowActions>
                )}
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-4 gap-2 text-center">
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Setor</div>
                <div className="text-sm font-semibold text-ink">{e.setor}</div>
              </div>
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Rua</div>
                <div className="text-sm font-semibold text-ink">{e.rua}</div>
              </div>
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Módulo</div>
                <div className="text-sm font-semibold text-ink">{e.modulo}</div>
              </div>
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Nível</div>
                <div className="text-sm font-semibold text-ink">{e.nivel}</div>
              </div>
            </div>
          </Card>
        ))}
        {enderecos && enderecos.length === 0 && <div className="p-3 text-sm text-muted">Nenhum endereço encontrado.</div>}
      </div>

      {editando && (
        <EnderecoFormModal
          endereco={editando === 'novo' ? null : editando}
          depositoId={depositoId}
          onClose={() => setEditando(null)}
        />
      )}

      {gerandoFaixa && depositoParaGeracao && (
        <GerarFaixaModal depositoId={depositoParaGeracao} onClose={() => setGerandoFaixa(false)} />
      )}

      {inativando && (
        <ConfirmDialog
          titulo="Inativar endereço?"
          descricao={`"${inativando.codigo}" deixa de aparecer para novas contagens, mas o histórico é preservado.`}
          rotuloConfirmar="Inativar"
          variante="perigo"
          pendente={atualizar.isPending}
          onCancelar={() => setInativando(null)}
          onConfirmar={() => executarAlternarAtivo(inativando)}
        />
      )}

      {excluindo && (
        <ConfirmDialog
          titulo="Excluir endereço?"
          descricao={`"${excluindo.codigo}" será apagado permanentemente. Só é possível excluir endereços sem saldo ou movimentação vinculados — se houver, inative em vez de excluir.`}
          rotuloConfirmar="Excluir"
          variante="perigo"
          pendente={excluir.isPending}
          onCancelar={() => setExcluindo(null)}
          onConfirmar={() => executarExclusao(excluindo)}
        />
      )}
    </div>
  );
}
