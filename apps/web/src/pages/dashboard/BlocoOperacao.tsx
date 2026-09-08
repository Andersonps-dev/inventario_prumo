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

  if (isLoading || !data) return <div className="text-nevoa">Carregando…</div>;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-aco">Operação</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard rotulo="Escopos abertos" valor={data.escoposAbertos.length} aoClicar={() => navigate('/escopos')} />
        {data.cobertura.map((c) => (
          <StatCard key={c.dias} rotulo={`Cobertura ${c.dias}d`} valor={`${c.percentual.toFixed(0)}%`} />
        ))}
      </div>

      <Card>
        <div className="mb-2 text-sm font-semibold text-aco">Escopos abertos</div>
        {data.escoposAbertos.length === 0 ? (
          <div className="text-sm text-nevoa">Nenhum escopo aberto no momento.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.escoposAbertos.map((e) => (
              <button key={e.id} onClick={() => navigate(`/escopos/${e.id}`)} className="text-left">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-aco">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-mono">{e.codigo}</span> — {e.titulo}
                  </span>
                  <span
                    className={`shrink-0 ${e.diasAtePrazo !== null && e.diasAtePrazo <= 2 ? 'text-divergente' : 'text-nevoa'}`}
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
          <div className="mb-2 text-sm font-semibold text-aco">Produtividade por operador</div>
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
          <div className="mt-3 text-xs text-nevoa">
            Tempo médio abertura → efetivação:{' '}
            <span className="font-semibold text-aco">
              {data.tempoMedioAberturaEfetivacaoHoras !== null ? `${data.tempoMedioAberturaEfetivacaoHoras.toFixed(1)}h` : '—'}
            </span>
          </div>
        </Card>

        <Card>
          <div className="mb-2 text-sm font-semibold text-aco">Itens nunca inventariados</div>
          {data.itensNuncaInventariados.length === 0 ? (
            <div className="text-sm text-nevoa">Todo o catálogo já entrou em algum inventário.</div>
          ) : (
            <ul className="max-h-48 overflow-y-auto text-sm">
              {data.itensNuncaInventariados.map((p) => (
                <li key={p.id} className="text-aco">
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
