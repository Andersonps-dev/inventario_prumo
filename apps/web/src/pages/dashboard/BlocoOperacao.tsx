import { useNavigate } from 'react-router-dom';
import { useOperacao } from '../../api/hooks';
import { StatCard } from '../../components/charts/StatCard';
import { ProgressBar } from '../../components/ProgressBar';
import { Table, Th, Td } from '../../components/Table';
import { Card } from '../../components/Card';
import type { FiltrosDashboard } from '../../api/hooks';

export function BlocoOperacao({ filtros }: { filtros: FiltrosDashboard }) {
  const navigate = useNavigate();
  const { data, isLoading } = useOperacao(filtros);

  if (isLoading || !data) return <div className="text-muted">Carregando…</div>;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Operação</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard rotulo="Escopos abertos" valor={data.escoposAbertos.length} aoClicar={() => navigate('/escopos')} />
        {data.cobertura.map((c) => (
          <StatCard key={c.dias} rotulo={`Cobertura ${c.dias}d`} valor={`${c.percentual.toFixed(0)}%`} />
        ))}
      </div>

      <Card>
        <div className="mb-2 text-sm font-semibold text-ink">Escopos abertos</div>
        {data.escoposAbertos.length === 0 ? (
          <div className="text-sm text-muted">Nenhum escopo aberto no momento.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.escoposAbertos.map((e) => (
              <button key={e.id} onClick={() => navigate(`/escopos/${e.id}`)} className="text-left">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-ink">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-mono">{e.codigo}</span> — {e.titulo}
                  </span>
                  <span
                    className={`shrink-0 ${e.diasAtePrazo !== null && e.diasAtePrazo <= 2 ? 'text-danger' : 'text-muted'}`}
                  >
                    {e.diasAtePrazo !== null ? `${e.diasAtePrazo}d até o prazo` : 'sem prazo'}
                  </span>
                </div>
                <ProgressBar percentual={e.percentualConcluido} />
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 text-sm font-semibold text-ink">Produtividade por operador</div>

          {/* Desktop/tablet: tabela completa. */}
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>Operador</Th>
                  <Th>Contagens</Th>
                  <Th>Contagens/h</Th>
                </tr>
              </thead>
              <tbody>
                {data.produtividadePorOperador.map((p) => (
                  <tr key={p.usuarioId}>
                    <Td>{p.nome}</Td>
                    <Td>{p.totalContagens}</Td>
                    <Td>{p.contagensPorHora.toFixed(1)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Celular: lista compacta — 3ª coluna cortava na tabela. */}
          <div className="flex flex-col gap-1 md:hidden">
            {data.produtividadePorOperador.map((p) => (
              <div key={p.usuarioId} className="flex items-center gap-2 border-b border-stroke/10 py-2 text-sm last:border-0">
                <div className="min-w-0 flex-1 truncate text-ink">{p.nome}</div>
                <div className="shrink-0 text-right">
                  <div className="text-ink [font-variant-numeric:tabular-nums]">{p.totalContagens} contagens</div>
                  <div className="text-xs text-muted [font-variant-numeric:tabular-nums]">{p.contagensPorHora.toFixed(1)}/h</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-xs text-muted">
            Tempo médio abertura → efetivação:{' '}
            <span className="font-semibold text-ink">
              {data.tempoMedioAberturaEfetivacaoHoras !== null ? `${data.tempoMedioAberturaEfetivacaoHoras.toFixed(1)}h` : '—'}
            </span>
          </div>
        </Card>

        <Card>
          <div className="mb-2 text-sm font-semibold text-ink">Itens nunca inventariados</div>
          {data.itensNuncaInventariados.length === 0 ? (
            <div className="text-sm text-muted">Todo o catálogo já entrou em algum inventário.</div>
          ) : (
            <ul className="max-h-48 overflow-y-auto text-sm">
              {data.itensNuncaInventariados.map((p) => (
                <li key={p.id} className="text-ink">
                  <span className="font-mono text-xs">{p.sku}</span> — {p.nome}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
