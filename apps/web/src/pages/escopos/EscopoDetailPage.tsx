import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useAbrirEscopo,
  useCancelarEscopo,
  useCancelarItem,
  useEncerrarContagem,
  useEscopo,
  useReabrirEscopo,
} from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { RowActions, RowAction } from '../../components/RowActions';
import { ProgressBar } from '../../components/ProgressBar';
import { useAuth } from '../../app/AuthContext';
import { ApiError, baixarArquivo } from '../../api/client';
import { ContagemRapida } from './ContagemRapida';
import { ConferenciaPainel } from './ConferenciaPainel';
import { AdicionarItensModal } from './AdicionarItensModal';
import { CancelarContagemModal } from './CancelarContagemModal';
import { ExportButton } from '../../components/ExportButton';
import { PromptDialog } from '../../components/PromptDialog';
import { VoltarLink } from '../../components/VoltarLink';
import type { EscopoItem } from '../../api/types';

type Filtro = 'TODOS' | 'PENDENTES' | 'CONTADOS' | 'DIVERGENTES';

export function EscopoDetailPage() {
  const { id } = useParams();
  const escopoId = Number(id);
  const { temPapel } = useAuth();
  const { data: escopo, isLoading } = useEscopo(escopoId);
  const abrir = useAbrirEscopo();
  const encerrarContagem = useEncerrarContagem();
  const reabrir = useReabrirEscopo();
  const cancelarEscopo = useCancelarEscopo();
  const cancelarItem = useCancelarItem();

  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [adicionandoItens, setAdicionandoItens] = useState(false);
  const [cancelandoItem, setCancelandoItem] = useState<EscopoItem | null>(null);
  const [motivoPendente, setMotivoPendente] = useState<{
    titulo: string;
    onConfirmar: (motivo: string) => Promise<unknown>;
  } | null>(null);
  const [enviandoMotivo, setEnviandoMotivo] = useState(false);

  if (isLoading || !escopo) return <div className="text-muted">Carregando…</div>;

  const itensValidos = escopo.itens.filter((i) => i.status !== 'CANCELADO');
  const contados = itensValidos.filter((i) => i.status === 'CONTADO').length;
  const divergentes = itensValidos.filter((i) => i.diferenca && Number(i.diferenca) !== 0).length;
  const percentual = itensValidos.length ? (contados / itensValidos.length) * 100 : 0;

  const itensFiltrados = itensValidos.filter((i) => {
    if (filtro === 'PENDENTES') return i.status === 'PENDENTE';
    if (filtro === 'CONTADOS') return i.status === 'CONTADO';
    if (filtro === 'DIVERGENTES') return i.diferenca && Number(i.diferenca) !== 0;
    return true;
  });

  const podeGerenciar = temPapel('ADMIN', 'SUPERVISOR');

  const acao = async (fn: () => Promise<unknown>) => {
    setErro(null);
    setAviso(null);
    try {
      await fn();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Ação não permitida.');
    }
  };

  const abrirEscopo = () =>
    acao(async () => {
      const resultado = await abrir.mutateAsync({ id: escopoId });
      if (resultado.itensCriados === 0 && resultado.ignoradosPorConflito > 0) {
        setAviso(
          `Escopo aberto sem nenhum item: ${resultado.ignoradosPorConflito} produto(s) do critério já estão em outro escopo ativo neste depósito. Use "Adicionar itens" para incluir manualmente, ou resolva o outro escopo primeiro.`,
        );
      } else if (resultado.itensCriados === 0) {
        setAviso('Escopo aberto sem nenhum item: nenhum produto correspondeu ao critério de seleção. Use "Adicionar itens" para incluir manualmente.');
      } else if (resultado.ignoradosPorConflito > 0) {
        setAviso(
          `Escopo aberto com ${resultado.itensCriados} ite${resultado.itensCriados === 1 ? 'm' : 'ns'}. ${resultado.ignoradosPorConflito} produto(s) foram ignorados por já estarem em outro escopo ativo neste depósito.`,
        );
      }
    });

  const confirmarMotivo = async (motivo: string) => {
    if (!motivoPendente) return;
    setEnviandoMotivo(true);
    setErro(null);
    try {
      await motivoPendente.onConfirmar(motivo);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Ação não permitida.');
    } finally {
      setEnviandoMotivo(false);
      setMotivoPendente(null);
    }
  };

  const onCancelarEscopo = () => {
    setMotivoPendente({
      titulo: 'Cancelar escopo',
      onConfirmar: (motivo) => cancelarEscopo.mutateAsync({ id: escopoId, body: { motivo } }),
    });
  };

  const onCancelarItem = (item: EscopoItem) => {
    setMotivoPendente({
      titulo: `Remover "${item.produto.nome}" do escopo`,
      onConfirmar: (motivo) => cancelarItem.mutateAsync({ escopoId, itemId: item.id, motivo }),
    });
  };

  const podeContar = escopo.status === 'ABERTO' || escopo.status === 'EM_CONTAGEM';

  return (
    <div className="flex flex-col gap-4">
      <VoltarLink to="/escopos" label="Inventários" />

      {/* Cabeçalho essencial: sempre primeiro, identifica o escopo antes de tudo. */}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-sm text-muted">{escopo.codigo}</div>
            <h1 className="truncate text-xl font-semibold text-ink">{escopo.titulo}</h1>
          </div>
          <Badge tom={escopo.status}>{escopo.status}</Badge>
        </div>

        {escopo.status !== 'RASCUNHO' && escopo.status !== 'CANCELADO' && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>
                contados {contados}/{itensValidos.length} · divergentes {divergentes}
              </span>
              <span>{percentual.toFixed(0)}%</span>
            </div>
            <ProgressBar percentual={percentual} />
          </div>
        )}

        {erro && <div className="mt-3 text-sm text-danger">{erro}</div>}
        {aviso && <div className="mt-3 rounded-md bg-warning/10 p-2 text-sm text-warning">{aviso}</div>}
      </Card>

      {/* No celular/coletor, o campo de bipagem vem logo em seguida — antes dos
          detalhes administrativos — e fica grudado no topo ao rolar a lista. */}
      {podeContar && (
        <div className="md:order-3">
          <ContagemRapida
            escopoId={escopoId}
            depositoId={escopo.deposito.id}
            itens={itensValidos}
            enderecoIdsAlvo={escopo.criterioSelecao?.tipo === 'POR_ENDERECO' ? escopo.criterioSelecao.enderecoIds : undefined}
          />
        </div>
      )}

      {/* Detalhes e ações de gestão: secundário no celular, mas continua logo
          após o cabeçalho no desktop (onde há espaço de sobra). */}
      <Card className="md:order-2">
        <div className="text-sm text-muted">
          Depósito {escopo.deposito.nome} · Resp. {escopo.responsavel?.nome ?? '—'} ·{' '}
          Prazo {escopo.prazo ? new Date(escopo.prazo).toLocaleDateString('pt-BR') : '—'}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {podeGerenciar && escopo.status === 'RASCUNHO' && (
            <Button variante="primaria" onClick={abrirEscopo}>
              Abrir escopo
            </Button>
          )}
          {podeGerenciar && ['ABERTO', 'EM_CONTAGEM'].includes(escopo.status) && (
            <Button onClick={() => setAdicionandoItens(true)}>Adicionar itens</Button>
          )}
          {podeGerenciar && escopo.status === 'EM_CONTAGEM' && (
            <Button variante="primaria" onClick={() => acao(() => encerrarContagem.mutateAsync({ id: escopoId }))}>
              Encerrar contagem
            </Button>
          )}
          {podeGerenciar && escopo.status === 'CONFERENCIA' && (
            <Button onClick={() => acao(() => reabrir.mutateAsync({ id: escopoId }))}>Reabrir contagem</Button>
          )}
          {podeGerenciar && ['RASCUNHO', 'ABERTO', 'EM_CONTAGEM', 'CONFERENCIA'].includes(escopo.status) && (
            <Button variante="perigo" onClick={onCancelarEscopo}>
              Cancelar escopo
            </Button>
          )}
          {escopo.status === 'EFETIVADO' && (
            <>
              <Button onClick={() => baixarArquivo(`/escopos/${escopoId}/comprovante.pdf`, `${escopo.codigo}.pdf`)}>
                Comprovante PDF
              </Button>
              <Button onClick={() => baixarArquivo(`/escopos/${escopoId}/comprovante.xlsx`, `${escopo.codigo}.xlsx`)}>
                Comprovante XLSX
              </Button>
            </>
          )}
          <ExportButton tipo="escopo" filtros={{ escopoId }} rotulo="Exportar escopo" />
          <ExportButton tipo="contagens" filtros={{ escopoId }} rotulo="Exportar contagens" />
        </div>
      </Card>

      <div className="md:order-4">
        {escopo.status === 'CONFERENCIA' || escopo.status === 'EFETIVADO' ? (
          <ConferenciaPainel escopoId={escopoId} />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {(['TODOS', 'PENDENTES', 'CONTADOS', 'DIVERGENTES'] as Filtro[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    filtro === f ? 'bg-primary text-white' : 'border border-stroke bg-card text-ink'
                  }`}
                >
                  {f === 'TODOS' ? 'Todos' : f === 'PENDENTES' ? 'Pendentes' : f === 'CONTADOS' ? 'Contados' : 'Divergentes'}
                </button>
              ))}
            </div>

            {/* Desktop/tablet: tabela completa. */}
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>SKU</Th>
                    <Th>Produto</Th>
                    <Th>Endereço</Th>
                    <Th>Congelado</Th>
                    <Th>Contado</Th>
                    <Th>Dif.</Th>
                    <Th>Status</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {itensFiltrados.map((item) => (
                    <tr key={item.id}>
                      <Td className="font-mono text-xs">{item.produto.sku}</Td>
                      <Td>{item.produto.nome}</Td>
                      <Td className="font-mono text-xs text-muted">{item.endereco.interno ? '—' : item.endereco.codigo}</Td>
                      <Td>{item.saldoCongelado}</Td>
                      <Td>{item.quantidadeFinal ?? '—'}</Td>
                      <Td className={item.diferenca && Number(item.diferenca) !== 0 ? 'text-danger font-semibold' : ''}>
                        {item.diferenca ?? '—'}
                      </Td>
                      <Td>
                        <Badge tom={item.status}>{item.status}</Badge>
                      </Td>
                      <Td>
                        {podeGerenciar && (
                          <RowActions>
                            {item.status === 'CONTADO' && (
                              <RowAction className="text-xs" onClick={() => setCancelandoItem(item)}>
                                Cancelar contagem
                              </RowAction>
                            )}
                            <RowAction tom="perigo" className="text-xs" onClick={() => onCancelarItem(item)}>
                              Remover
                            </RowAction>
                          </RowActions>
                        )}
                      </Td>
                    </tr>
                  ))}
                  {itensFiltrados.length === 0 && (
                    <tr>
                      <Td className="text-muted">Nenhum item neste filtro.</Td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>

            {/* Celular/coletor: cards empilhados — sem rolagem lateral, e
                congelado/contado/diferença sempre visíveis de uma vez. */}
            <div className="flex flex-col gap-2 md:hidden">
              {itensFiltrados.map((item) => {
                const diferenca = item.diferenca ? Number(item.diferenca) : null;
                return (
                  <Card key={item.id} padding="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-muted">{item.produto.sku}</div>
                        <div className="truncate text-sm font-medium text-ink">{item.produto.nome}</div>
                        {!item.endereco.interno && (
                          <div className="font-mono text-[11px] text-warning">{item.endereco.codigo}</div>
                        )}
                      </div>
                      <Badge tom={item.status}>{item.status}</Badge>
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md bg-surface py-1.5">
                        <div className="text-[10px] uppercase tracking-wide text-muted">Congelado</div>
                        <div className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">{item.saldoCongelado}</div>
                      </div>
                      <div className="rounded-md bg-surface py-1.5">
                        <div className="text-[10px] uppercase tracking-wide text-muted">Contado</div>
                        <div className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">
                          {item.quantidadeFinal ?? '—'}
                        </div>
                      </div>
                      <div className="rounded-md bg-surface py-1.5">
                        <div className="text-[10px] uppercase tracking-wide text-muted">Diferença</div>
                        <div
                          className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${
                            diferenca ? 'text-danger' : 'text-ink'
                          }`}
                        >
                          {item.diferenca ?? '—'}
                        </div>
                      </div>
                    </div>
                    {podeGerenciar && (
                      <RowActions>
                        {item.status === 'CONTADO' && (
                          <RowAction className="mt-2 text-xs" onClick={() => setCancelandoItem(item)}>
                            Cancelar contagem
                          </RowAction>
                        )}
                        <RowAction tom="perigo" className="mt-2 text-xs" onClick={() => onCancelarItem(item)}>
                          Remover
                        </RowAction>
                      </RowActions>
                    )}
                  </Card>
                );
              })}
              {itensFiltrados.length === 0 && <div className="p-3 text-sm text-muted">Nenhum item neste filtro.</div>}
            </div>
          </div>
        )}
      </div>

      {adicionandoItens && (
        <AdicionarItensModal escopoId={escopoId} depositoId={escopo.deposito.id} onClose={() => setAdicionandoItens(false)} />
      )}

      {cancelandoItem && (
        <CancelarContagemModal escopoId={escopoId} item={cancelandoItem} onClose={() => setCancelandoItem(null)} />
      )}

      {motivoPendente && (
        <PromptDialog
          titulo={motivoPendente.titulo}
          rotuloCampo="Motivo"
          placeholder="Explique o motivo para o registro de auditoria…"
          rotuloConfirmar="Confirmar"
          variante="perigo"
          pendente={enviandoMotivo}
          onCancelar={() => setMotivoPendente(null)}
          onConfirmar={confirmarMotivo}
        />
      )}
    </div>
  );
}
