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
import { RetornoFeiraModal } from './RetornoFeiraModal';
import { AdicionarItensFeiraModal } from './AdicionarItensFeiraModal';
import { EditarFeiraModal } from './EditarFeiraModal';

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function FeiraDetailPage() {
  const { id } = useParams();
  const eventoId = Number(id);
  const { temPapel } = useAuth();
  const { data: evento, isLoading } = useEventoVenda(eventoId);
  const fechar = useFecharEventoVenda();
  const [editando, setEditando] = useState(false);
  const [adicionandoItens, setAdicionandoItens] = useState(false);
  const [registrandoRetorno, setRegistrandoRetorno] = useState(false);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (isLoading || !evento) return <div className="text-nevoa">Carregando…</div>;

  const podeGerenciar = temPapel('ADMIN', 'SUPERVISOR');
  const itensNaFeira = evento.posicaoAtual ?? [];

  const onFechar = async () => {
    setErro(null);
    try {
      await fechar.mutateAsync(eventoId);
      setConfirmandoFechar(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível fechar a feira.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink to="/feiras" label="Feiras" />

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-aco">{evento.titulo}</h1>
            {podeGerenciar && (
              <button type="button" className="text-xs text-latao-escuro hover:underline" onClick={() => setEditando(true)}>
                Editar
              </button>
            )}
          </div>
          <Badge tom={evento.status}>{evento.status}</Badge>
        </div>
        <div className="mt-1 text-sm text-nevoa">
          Depósito de origem: {evento.depositoOrigem.nome} · Criado por {evento.criadoPorUsuario.nome} em{' '}
          {new Date(evento.criadoEm).toLocaleString('pt-BR')}
        </div>
        <div className="text-sm text-nevoa">
          Data da feira: {evento.dataEvento ? new Date(evento.dataEvento).toLocaleDateString('pt-BR') : 'não definida'}
        </div>
        {evento.status === 'FECHADO' && evento.fechadoEm && (
          <div className="text-sm text-nevoa">
            Fechado por {evento.fechadoPorUsuario?.nome ?? '—'} em {new Date(evento.fechadoEm).toLocaleString('pt-BR')}
          </div>
        )}
        {erro && <div className="mt-2 text-sm text-divergente">{erro}</div>}
      </Card>

      {evento.status === 'ABERTO' ? (
        <>
          {podeGerenciar && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setAdicionandoItens(true)}>Adicionar itens</Button>
                <Button disabled={itensNaFeira.length === 0} onClick={() => setRegistrandoRetorno(true)}>
                  Registrar retorno
                </Button>
                <Button variante="perigo" onClick={() => setConfirmandoFechar(true)}>
                  Fechar feira e gerar relatório
                </Button>
              </div>
              <p className="text-xs text-nevoa">
                Só registre retorno pros itens que não venderam e voltaram fisicamente. Vendeu tudo? Pode fechar direto —
                o que sobrar na feira já é considerado vendido automaticamente, sem precisar registrar retorno de 0.
              </p>
            </div>
          )}

          <div>
            <div className="mb-2 text-sm font-semibold text-aco">Itens ainda na feira (não vendidos nem devolvidos)</div>

            {/* Desktop/tablet: tabela completa. */}
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>SKU</Th>
                    <Th>Produto</Th>
                    <Th>Un.</Th>
                    <Th>Quantidade</Th>
                    <Th>Valor a custo</Th>
                  </tr>
                </thead>
                <tbody>
                  {itensNaFeira.map((p) => (
                    <tr key={p.produto_id}>
                      <Td className="font-mono text-xs">{p.sku}</Td>
                      <Td>{p.nome}</Td>
                      <Td>{p.unidade}</Td>
                      <Td>{p.saldo}</Td>
                      <Td>{moeda(p.valor_total)}</Td>
                    </tr>
                  ))}
                  {itensNaFeira.length === 0 && (
                    <tr>
                      <Td className="text-nevoa">Nada na feira ainda — tudo foi devolvido ou vendido.</Td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>

            {/* Celular: cards empilhados. */}
            <div className="flex flex-col gap-2 md:hidden">
              {itensNaFeira.map((p) => (
                <Card key={p.produto_id} padding="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-nevoa">{p.sku}</div>
                      <div className="truncate text-sm font-medium text-aco">{p.nome}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-nevoa">
                      Valor
                      <div className="text-sm font-semibold text-aco">{moeda(p.valor_total)}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-md bg-concreto py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-nevoa">Un.</div>
                      <div className="text-sm font-semibold text-aco">{p.unidade}</div>
                    </div>
                    <div className="rounded-md bg-concreto py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-nevoa">Quantidade</div>
                      <div className="text-sm font-semibold text-aco [font-variant-numeric:tabular-nums]">{p.saldo}</div>
                    </div>
                  </div>
                </Card>
              ))}
              {itensNaFeira.length === 0 && (
                <div className="p-3 text-sm text-nevoa">Nada na feira ainda — tudo foi devolvido ou vendido.</div>
              )}
            </div>
          </div>
        </>
      ) : (
        evento.relatorioFechamento && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-aco">Relatório de venda</div>
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
                      <Td className="text-nevoa">Nada foi vendido — tudo voltou pro estoque.</Td>
                    </tr>
                  )}
                </tbody>
                {evento.relatorioFechamento.itens.length > 0 && (
                  <tfoot>
                    <tr>
                      <Td colSpan={3} className="bg-concreto font-semibold">
                        Total
                      </Td>
                      <Td className="bg-concreto font-semibold">{evento.relatorioFechamento.quantidadeTotal}</Td>
                      <Td className="bg-concreto"></Td>
                      <Td className="bg-concreto font-semibold">{moeda(evento.relatorioFechamento.valorTotal)}</Td>
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
                      <div className="font-mono text-xs text-nevoa">{i.sku}</div>
                      <div className="truncate text-sm font-medium text-aco">{i.nome}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-nevoa">
                      Total
                      <div className="text-sm font-semibold text-aco">{moeda(i.valorTotal)}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-concreto py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-nevoa">Un.</div>
                      <div className="text-sm font-semibold text-aco">{i.unidade}</div>
                    </div>
                    <div className="rounded-md bg-concreto py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-nevoa">Qtd. vendida</div>
                      <div className="text-sm font-semibold text-aco [font-variant-numeric:tabular-nums]">{i.quantidade}</div>
                    </div>
                    <div className="rounded-md bg-concreto py-1.5">
                      <div className="text-[10px] uppercase tracking-wide text-nevoa">Valor unit.</div>
                      <div className="text-sm font-semibold text-aco [font-variant-numeric:tabular-nums]">
                        {moeda(i.precoCustoUnitario)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {evento.relatorioFechamento.itens.length === 0 && (
                <div className="p-3 text-sm text-nevoa">Nada foi vendido — tudo voltou pro estoque.</div>
              )}
              {evento.relatorioFechamento.itens.length > 0 && (
                <Card padding="p-3" className="flex items-center justify-between bg-concreto">
                  <span className="text-sm font-semibold text-aco">Total: {evento.relatorioFechamento.quantidadeTotal}</span>
                  <span className="text-sm font-semibold text-aco">{moeda(evento.relatorioFechamento.valorTotal)}</span>
                </Card>
              )}
            </div>
          </div>
        )
      )}

      {editando && <EditarFeiraModal evento={evento} onClose={() => setEditando(false)} />}

      {adicionandoItens && (
        <AdicionarItensFeiraModal
          eventoId={eventoId}
          depositoOrigemId={evento.depositoOrigemId}
          onClose={() => setAdicionandoItens(false)}
        />
      )}

      {registrandoRetorno && (
        <RetornoFeiraModal
          eventoId={eventoId}
          depositoOrigemId={evento.depositoOrigemId}
          itensNaFeira={itensNaFeira}
          onClose={() => setRegistrandoRetorno(false)}
        />
      )}

      {confirmandoFechar && (
        <ConfirmDialog
          titulo="Fechar feira?"
          descricao="Essa ação é irreversível. Tudo que ainda estiver na feira será considerado vendido, entra no relatório com o valor de custo e some do saldo do sistema. Já devolveu tudo que não vendeu?"
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
