import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCancelarEntrada, useEntrada, useFinalizarEntrada } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PromptDialog } from '../../components/PromptDialog';
import { VoltarLink } from '../../components/VoltarLink';
import { useAuth } from '../../app/AuthContext';
import { ApiError } from '../../api/client';
import { EntradaBipagem } from './EntradaBipagem';
import { EntradaDistribuicao } from './EntradaDistribuicao';

export function EntradaDetailPage() {
  const { id } = useParams();
  const entradaId = Number(id);
  const { temPapel } = useAuth();
  const { data: entrada, isLoading } = useEntrada(entradaId);
  const finalizar = useFinalizarEntrada();
  const cancelar = useCancelarEntrada();
  const [confirmandoFinalizar, setConfirmandoFinalizar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (isLoading || !entrada) return <div className="text-muted">Carregando…</div>;

  const podeGerenciar = temPapel('ADMIN', 'SUPERVISOR');

  const onFinalizar = async () => {
    setErro(null);
    try {
      await finalizar.mutateAsync(entradaId);
      setConfirmandoFinalizar(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível finalizar a entrada.');
    }
  };

  const onCancelar = async (motivo: string) => {
    setErro(null);
    try {
      await cancelar.mutateAsync({ id: entradaId, motivo });
      setCancelando(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível cancelar a entrada.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink to="/entradas" label="Entradas" />

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-sm text-muted">{entrada.codigo}</div>
          <Badge tom={entrada.status}>{entrada.status}</Badge>
        </div>
        <div className="mt-1 text-sm text-ink">
          NF {entrada.nota} · Depósito {entrada.deposito.nome}
        </div>
        <div className="text-sm text-muted">
          Criada por {entrada.criadoPorUsuario.nome} em {new Date(entrada.criadoEm).toLocaleString('pt-BR')}
        </div>
        {entrada.status === 'CANCELADA' && entrada.canceladoEm && (
          <div className="text-sm text-muted">
            Cancelada por {entrada.canceladoPorUsuario?.nome ?? '—'} em {new Date(entrada.canceladoEm).toLocaleString('pt-BR')}
            {entrada.motivoCancelamento && <> — {entrada.motivoCancelamento}</>}
          </div>
        )}
        {entrada.status === 'CONCLUIDA' && entrada.concluidoEm && (
          <div className="text-sm text-muted">Concluída em {new Date(entrada.concluidoEm).toLocaleString('pt-BR')}</div>
        )}
        {erro && <div className="mt-2 text-sm text-danger">{erro}</div>}
      </Card>

      {entrada.status === 'RASCUNHO' && podeGerenciar && (
        <>
          <EntradaBipagem entradaId={entradaId} />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button variante="primaria" disabled={entrada.itens.length === 0} onClick={() => setConfirmandoFinalizar(true)}>
              Finalizar entrada e distribuir
            </Button>
            <Button variante="perigo" onClick={() => setCancelando(true)}>
              Cancelar entrada
            </Button>
          </div>
        </>
      )}

      {(entrada.status === 'EM_DISTRIBUICAO' || entrada.status === 'CONCLUIDA') && podeGerenciar && (
        <EntradaDistribuicao entradaId={entradaId} depositoId={entrada.deposito.id} itens={entrada.itens} />
      )}

      <div>
        <div className="mb-2 text-sm font-semibold text-ink">Itens recebidos</div>

        {/* Desktop/tablet: tabela completa. */}
        <div className="hidden md:block">
          <Table>
            <thead>
              <tr>
                <Th>SKU</Th>
                <Th>Produto</Th>
                <Th>Un.</Th>
                <Th>Recebido</Th>
                <Th>Distribuído</Th>
                <Th>Restante</Th>
              </tr>
            </thead>
            <tbody>
              {entrada.itens.map((i) => {
                const restante = Number(i.quantidadeRecebida) - Number(i.quantidadeDistribuida);
                return (
                  <tr key={i.id}>
                    <Td className="font-mono text-xs">{i.produto.sku}</Td>
                    <Td>{i.produto.nome}</Td>
                    <Td>{i.produto.unidade}</Td>
                    <Td>{i.quantidadeRecebida}</Td>
                    <Td>{i.quantidadeDistribuida}</Td>
                    <Td className={restante > 0 ? 'font-medium text-warning' : 'text-success'}>{restante}</Td>
                  </tr>
                );
              })}
              {entrada.itens.length === 0 && (
                <tr>
                  <Td className="text-muted">Nenhum item bipado ainda.</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* Celular: cards empilhados. */}
        <div className="flex flex-col gap-2 md:hidden">
          {entrada.itens.map((i) => {
            const restante = Number(i.quantidadeRecebida) - Number(i.quantidadeDistribuida);
            return (
              <Card key={i.id} padding="p-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-muted">{i.produto.sku}</div>
                  <div className="truncate text-sm font-medium text-ink">{i.produto.nome}</div>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-surface py-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-muted">Recebido</div>
                    <div className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">{i.quantidadeRecebida}</div>
                  </div>
                  <div className="rounded-md bg-surface py-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-muted">Distribuído</div>
                    <div className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">{i.quantidadeDistribuida}</div>
                  </div>
                  <div className="rounded-md bg-surface py-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-muted">Restante</div>
                    <div className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${restante > 0 ? 'text-warning' : 'text-success'}`}>
                      {restante}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {entrada.itens.length === 0 && <div className="p-3 text-sm text-muted">Nenhum item bipado ainda.</div>}
        </div>
      </div>

      {confirmandoFinalizar && (
        <ConfirmDialog
          titulo="Finalizar entrada?"
          descricao="A lista do que foi recebido fica travada — não dá mais pra bipar produto novo. Você vai pra etapa de distribuição, onde escolhe pra qual posição cada quantidade vai."
          rotuloConfirmar="Sim, finalizar"
          variante="primaria"
          pendente={finalizar.isPending}
          onCancelar={() => setConfirmandoFinalizar(false)}
          onConfirmar={onFinalizar}
        />
      )}

      {cancelando && (
        <PromptDialog
          titulo="Cancelar entrada"
          rotuloCampo="Motivo"
          placeholder="Explique o motivo para o registro de auditoria…"
          rotuloConfirmar="Confirmar cancelamento"
          variante="perigo"
          pendente={cancelar.isPending}
          onCancelar={() => setCancelando(false)}
          onConfirmar={onCancelar}
        />
      )}
    </div>
  );
}
