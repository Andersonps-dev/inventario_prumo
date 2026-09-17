import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEventoVenda, useFecharEventoVenda } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ExportButton } from '../../components/ExportButton';
import { VoltarLink } from '../../components/VoltarLink';
import { useAuth } from '../../app/AuthContext';
import { ApiError } from '../../api/client';
import { GremioBipagem } from './GremioBipagem';
import { AdicionarPosicoesModal } from './AdicionarPosicoesModal';
import { EditarFeiraModal } from './EditarFeiraModal';

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function FeiraDetailPage() {
  const { id } = useParams();
  const eventoId = Number(id);
  const { temPapel } = useAuth();
  const { data: evento, isLoading } = useEventoVenda(eventoId);
  const fechar = useFecharEventoVenda();
  const [editando, setEditando] = useState(false);
  const [adicionandoPosicoes, setAdicionandoPosicoes] = useState(false);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (isLoading || !evento) return <div className="text-muted">Carregando…</div>;

  const podeGerenciar = temPapel('ADMIN', 'SUPERVISOR');
  const itensReservados = evento.posicaoAtual ?? [];
  const posicoes = evento.posicoes ?? [];
  const posicoesAtuaisIds = new Set(posicoes.map((p) => p.enderecoId));

  const onFechar = async () => {
    setErro(null);
    try {
      await fechar.mutateAsync(eventoId);
      setConfirmandoFechar(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível fechar o grêmio.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink to="/feiras" label="Grêmios" />

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{evento.titulo}</h1>
            {podeGerenciar && (
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => setEditando(true)}>
                Editar
              </button>
            )}
          </div>
          <Badge tom={evento.status}>{evento.status}</Badge>
        </div>
        <div className="mt-1 text-sm text-muted">
          Depósito: {evento.depositoOrigem.nome} · Criado por {evento.criadoPorUsuario.nome} em{' '}
          {new Date(evento.criadoEm).toLocaleString('pt-BR')}
        </div>
        <div className="text-sm text-muted">
          Data do grêmio: {evento.dataEvento ? new Date(evento.dataEvento).toLocaleDateString('pt-BR') : 'não definida'}
        </div>
        {evento.status === 'FECHADO' && evento.fechadoEm && (
          <div className="text-sm text-muted">
            Fechado por {evento.fechadoPorUsuario?.nome ?? '—'} em {new Date(evento.fechadoEm).toLocaleString('pt-BR')}
          </div>
        )}
        {evento.status === 'ABERTO' && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">Posições:</span>
            {posicoes.map((p) => (
              <span key={p.enderecoId} className="rounded-full bg-surface px-2 py-0.5 font-mono text-xs text-ink">
                {p.interno ? 'sem endereço' : p.codigo}
              </span>
            ))}
            {podeGerenciar && (
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => setAdicionandoPosicoes(true)}>
                + Adicionar posições
              </button>
            )}
          </div>
        )}
        {erro && <div className="mt-2 text-sm text-danger">{erro}</div>}
      </Card>

      {evento.status === 'ABERTO' ? (
        <>
          {podeGerenciar && (
            <>
              <GremioBipagem eventoId={eventoId} depositoId={evento.depositoOrigemId} posicoes={posicoes} itensReservados={itensReservados} />
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-2">
                  <Button variante="perigo" onClick={() => setConfirmandoFechar(true)}>
                    Fechar grêmio e gerar relatório
                  </Button>
                </div>
                <p className="text-xs text-muted">Vendeu tudo? Pode fechar direto — o que sobrar reservado já entra como vendido.</p>
              </div>
            </>
          )}

          <div>
            <div className="mb-2 text-sm font-semibold text-ink">Itens ainda reservados (não vendidos nem devolvidos)</div>

            {/* Desktop/tablet: tabela completa. */}
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>SKU</Th>
                    <Th>Produto</Th>
                    <Th>Posição</Th>
                    <Th>Un.</Th>
                    <Th>Quantidade</Th>
                    <Th>Valor a custo</Th>
                  </tr>
                </thead>
                <tbody>
                  {itensReservados.map((p) => (
                    <tr key={`${p.produto_id}-${p.endereco_id}`}>
                      <Td className="font-mono text-xs">{p.sku}</Td>
                      <Td>{p.nome}</Td>
                      <Td className="font-mono text-xs text-muted">{p.endereco_interno ? '—' : p.posicao}</Td>
                      <Td>{p.unidade}</Td>
                      <Td>{p.saldo}</Td>
                      <Td>{moeda(p.valor_total)}</Td>
                    </tr>
                  ))}
                  {itensReservados.length === 0 && (
                    <tr>
                      <Td className="text-muted">Nada reservado ainda — tudo foi devolvido ou vendido.</Td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>

            {/* Celular: cards empilhados. */}
            <div className="flex flex-col gap-2 md:hidden">
              {itensReservados.map((p) => (
                <Card key={`${p.produto_id}-${p.endereco_id}`} padding="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-muted">{p.sku}</div>
                      <div className="truncate text-sm font-medium text-ink">{p.nome}</div>
                      {!p.endereco_interno && <div className="font-mono text-[11px] text-warning">{p.posicao}</div>}
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted">
                      Valor
                      <div className="text-sm font-semibold text-ink">{moeda(p.valor_total)}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-md bg-surface py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted">Un.</div>
                      <div className="text-sm font-semibold text-ink">{p.unidade}</div>
                    </div>
                    <div className="rounded-md bg-surface py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted">Quantidade</div>
                      <div className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">{p.saldo}</div>
                    </div>
                  </div>
                </Card>
              ))}
              {itensReservados.length === 0 && (
                <div className="p-3 text-sm text-muted">Nada reservado ainda — tudo foi devolvido ou vendido.</div>
              )}
            </div>
          </div>
        </>
      ) : (
        evento.relatorioFechamento && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-ink">Relatório de venda</div>
              {evento.relatorioFechamento.itens.length > 0 && (
                <ExportButton tipo="relatorio_feira" filtros={{ eventoVendaId: eventoId }} rotulo="Exportar relatório" />
              )}
            </div>
            {/* Desktop/tablet: tabela completa. */}
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>SKU</Th>
                    <Th>Produto</Th>
                    <Th>Un.</Th>
                    <Th>Quantidade vendida</Th>
                    <Th>Valor unit. (custo)</Th>
                    <Th>Valor total</Th>
                  </tr>
                </thead>
                <tbody>
                  {evento.relatorioFechamento.itens.map((i) => (
                    <tr key={i.produtoId}>
                      <Td className="font-mono text-xs">{i.sku}</Td>
                      <Td>{i.nome}</Td>
                      <Td>{i.unidade}</Td>
                      <Td>{i.quantidade}</Td>
                      <Td>{moeda(i.precoCustoUnitario)}</Td>
                      <Td>{moeda(i.valorTotal)}</Td>
                    </tr>
                  ))}
                  {evento.relatorioFechamento.itens.length === 0 && (
                    <tr>
                      <Td className="text-muted">Nada foi vendido — tudo voltou pro estoque.</Td>
                    </tr>
                  )}
                </tbody>
                {evento.relatorioFechamento.itens.length > 0 && (
                  <tfoot>
                    <tr>
                      <Td colSpan={3} className="bg-surface font-semibold">
                        Total
                      </Td>
                      <Td className="bg-surface font-semibold">{evento.relatorioFechamento.quantidadeTotal}</Td>
                      <Td className="bg-surface"></Td>
                      <Td className="bg-surface font-semibold">{moeda(evento.relatorioFechamento.valorTotal)}</Td>
                    </tr>
                  </tfoot>
                )}
              </Table>
            </div>

            {/* Celular: cards empilhados + card de total separado. */}
            <div className="flex flex-col gap-2 md:hidden">
              {evento.relatorioFechamento.itens.map((i) => (
                <Card key={i.produtoId} padding="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-muted">{i.sku}</div>
                      <div className="truncate text-sm font-medium text-ink">{i.nome}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted">
                      Total
                      <div className="text-sm font-semibold text-ink">{moeda(i.valorTotal)}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-surface py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted">Un.</div>
                      <div className="text-sm font-semibold text-ink">{i.unidade}</div>
                    </div>
                    <div className="rounded-md bg-surface py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted">Qtd. vendida</div>
                      <div className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">{i.quantidade}</div>
                    </div>
                    <div className="rounded-md bg-surface py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted">Valor unit.</div>
                      <div className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">
                        {moeda(i.precoCustoUnitario)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {evento.relatorioFechamento.itens.length === 0 && (
                <div className="p-3 text-sm text-muted">Nada foi vendido — tudo voltou pro estoque.</div>
              )}
              {evento.relatorioFechamento.itens.length > 0 && (
                <Card padding="p-3" className="flex items-center justify-between bg-surface">
                  <span className="text-sm font-semibold text-ink">Total: {evento.relatorioFechamento.quantidadeTotal}</span>
                  <span className="text-sm font-semibold text-ink">{moeda(evento.relatorioFechamento.valorTotal)}</span>
                </Card>
              )}
            </div>
          </div>
        )
      )}

      {editando && <EditarFeiraModal evento={evento} onClose={() => setEditando(false)} />}

      {adicionandoPosicoes && (
        <AdicionarPosicoesModal
          eventoId={eventoId}
          depositoOrigemId={evento.depositoOrigemId}
          posicoesAtuaisIds={posicoesAtuaisIds}
          onClose={() => setAdicionandoPosicoes(false)}
        />
      )}

      {confirmandoFechar && (
        <ConfirmDialog
          titulo="Fechar grêmio?"
          descricao="Essa ação é irreversível. Tudo que ainda estiver reservado será considerado vendido, entra no relatório com o valor de custo e sai do saldo do sistema. Já devolveu tudo que não vendeu?"
          rotuloConfirmar="Sim, fechar e gerar relatório"
          variante="perigo"
          pendente={fechar.isPending}
          onCancelar={() => setConfirmandoFechar(false)}
          onConfirmar={onFechar}
        />
      )}
    </div>
  );
}
