import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCancelarTransferencia, useEfetivarTransferencia, useTransferencia } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PromptDialog } from '../../components/PromptDialog';
import { VoltarLink } from '../../components/VoltarLink';
import { useAuth } from '../../app/AuthContext';
import { ApiError } from '../../api/client';
import { TransferenciaBipagem } from './TransferenciaBipagem';

export function TransferenciaDetailPage() {
  const { id } = useParams();
  const transferenciaId = Number(id);
  const { temPapel } = useAuth();
  const { data: transferencia, isLoading } = useTransferencia(transferenciaId);
  const efetivar = useEfetivarTransferencia();
  const cancelar = useCancelarTransferencia();
  const [confirmandoEfetivar, setConfirmandoEfetivar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (isLoading || !transferencia) return <div className="text-muted">Carregando…</div>;

  const podeGerenciar = temPapel('ADMIN', 'SUPERVISOR');

  const onEfetivar = async () => {
    setErro(null);
    try {
      await efetivar.mutateAsync(transferenciaId);
      setConfirmandoEfetivar(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível efetivar a transferência.');
    }
  };

  const onCancelar = async (motivo: string) => {
    setErro(null);
    try {
      await cancelar.mutateAsync({ id: transferenciaId, motivo });
      setCancelando(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível cancelar a transferência.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink to="/transferencias" label="Transferências" />

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-sm text-muted">{transferencia.codigo}</div>
          <Badge tom={transferencia.status}>{transferencia.status}</Badge>
        </div>
        <div className="mt-1 text-sm">
          <div className="text-muted">Depósito {transferencia.deposito.nome}</div>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-ink">
            <span className="whitespace-nowrap">{transferencia.enderecoOrigem.interno ? '—' : transferencia.enderecoOrigem.codigo}</span>
            <span className="shrink-0 text-muted">→</span>
            <span className="whitespace-nowrap">{transferencia.enderecoDestino.interno ? '—' : transferencia.enderecoDestino.codigo}</span>
          </div>
        </div>
        <div className="mt-1 text-sm text-muted">Criada por {transferencia.criadoPorUsuario.nome} em {new Date(transferencia.criadoEm).toLocaleString('pt-BR')}</div>
        {transferencia.status === 'EFETIVADA' && transferencia.efetivadoEm && (
          <div className="text-sm text-muted">
            Efetivada por {transferencia.efetivadoPorUsuario?.nome ?? '—'} em {new Date(transferencia.efetivadoEm).toLocaleString('pt-BR')}
          </div>
        )}
        {transferencia.status === 'CANCELADA' && transferencia.canceladoEm && (
          <div className="text-sm text-muted">
            Cancelada por {transferencia.canceladoPorUsuario?.nome ?? '—'} em {new Date(transferencia.canceladoEm).toLocaleString('pt-BR')}
            {transferencia.motivoCancelamento && <> — {transferencia.motivoCancelamento}</>}
          </div>
        )}
        {erro && <div className="mt-2 text-sm text-danger">{erro}</div>}
      </Card>

      {transferencia.status === 'ABERTA' && podeGerenciar && (
        <>
          <TransferenciaBipagem transferenciaId={transferenciaId} />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button variante="primaria" disabled={transferencia.itens.length === 0} onClick={() => setConfirmandoEfetivar(true)}>
              Efetivar transferência
            </Button>
            <Button variante="perigo" onClick={() => setCancelando(true)}>
              Cancelar transferência
            </Button>
          </div>
        </>
      )}

      <div>
        <div className="mb-2 text-sm font-semibold text-ink">Itens bipados</div>

        {/* Desktop/tablet: tabela completa. */}
        <div className="hidden md:block">
          <Table>
            <thead>
              <tr>
                <Th>SKU</Th>
                <Th>Produto</Th>
                <Th>Un.</Th>
                <Th>Quantidade</Th>
              </tr>
            </thead>
            <tbody>
              {transferencia.itens.map((i) => (
                <tr key={i.id}>
                  <Td className="font-mono text-xs">{i.produto.sku}</Td>
                  <Td>{i.produto.nome}</Td>
                  <Td>{i.produto.unidade}</Td>
                  <Td>{i.quantidade}</Td>
                </tr>
              ))}
              {transferencia.itens.length === 0 && (
                <tr>
                  <Td className="text-muted">Nenhum item bipado ainda.</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* Celular: cards empilhados. */}
        <div className="flex flex-col gap-2 md:hidden">
          {transferencia.itens.map((i) => (
            <Card key={i.id} padding="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-muted">{i.produto.sku}</div>
                  <div className="truncate text-sm font-medium text-ink">{i.produto.nome}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-wide text-muted">Qtd.</div>
                  <div className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">{i.quantidade}</div>
                </div>
              </div>
            </Card>
          ))}
          {transferencia.itens.length === 0 && <div className="p-3 text-sm text-muted">Nenhum item bipado ainda.</div>}
        </div>
      </div>

      {confirmandoEfetivar && (
        <ConfirmDialog
          titulo="Efetivar transferência?"
          descricao="O saldo bipado sai da posição de origem e entra na posição de destino agora. Confere se o saldo disponível na origem ainda comporta tudo o que foi bipado."
          rotuloConfirmar="Sim, efetivar"
          variante="primaria"
          pendente={efetivar.isPending}
          onCancelar={() => setConfirmandoEfetivar(false)}
          onConfirmar={onEfetivar}
        />
      )}

      {cancelando && (
        <PromptDialog
          titulo="Cancelar transferência"
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
