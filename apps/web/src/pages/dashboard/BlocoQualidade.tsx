import { useQualidadeInventario } from '../../api/hooks';
import { StatCard } from '../../components/charts/StatCard';
import { LineChart } from '../../components/charts/LineChart';
import { Table, Th, Td } from '../../components/Table';
import { Card } from '../../components/Card';
import { CATEGORICO } from '../../theme/chart-tokens';
import type { FiltrosDashboard } from '../../api/hooks';

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number) => `${n.toFixed(1)}%`;

export function BlocoQualidade({ filtros }: { filtros: FiltrosDashboard }) {
  const { data, isLoading } = useQualidadeInventario(filtros);

  if (isLoading || !data) return <div className="text-muted">Carregando…</div>;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Qualidade do inventário</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard rotulo="Acuracidade por item" valor={pct(data.acuraciadePorItem)} destaque={data.acuraciadePorItem >= 95 ? 'positivo' : 'negativo'} />
        <StatCard
          rotulo="Acuracidade por valor"
          valor={pct(data.acuraciadePorValor)}
          destaque={data.acuraciadePorValor >= 95 ? 'positivo' : 'negativo'}
        />
        <StatCard
          rotulo="Divergência líquida"
          valor={moeda(data.divergenciaLiquidaReais)}
          destaque={data.divergenciaLiquidaReais === 0 ? 'neutro' : data.divergenciaLiquidaReais > 0 ? 'positivo' : 'negativo'}
        />
        <StatCard rotulo="Produtos reincidentes" valor={data.reincidencia.length} destaque={data.reincidencia.length > 0 ? 'negativo' : 'neutro'} />
      </div>

      <Card>
        <div className="mb-2 text-sm font-semibold text-ink">Evolução da acuracidade por inventário</div>
        <LineChart
          rotulosEixoX={data.evolucaoAcuracidade.map((e) => e.codigo.replace('INV-', ''))}
          series={[
            { nome: 'Por item', valores: data.evolucaoAcuracidade.map((e) => e.acuraciadePorItem), cor: CATEGORICO[0] },
            { nome: 'Por valor', valores: data.evolucaoAcuracidade.map((e) => Math.max(0, e.acuraciadePorValor)), cor: CATEGORICO[1] },
          ]}
        />
      </Card>

      <Card>
        <div className="mb-2 text-sm font-semibold text-ink">Divergência por responsável de contagem</div>

        {/* Desktop/tablet: tabela completa. */}
        <div className="hidden md:block">
          <Table>
            <thead>
              <tr>
                <Th>Responsável</Th>
                <Th>Un. (abs.)</Th>
                <Th>R$ (abs.)</Th>
              </tr>
            </thead>
            <tbody>
              {data.divergenciaPorResponsavel.map((r) => (
                <tr key={r.responsavel}>
                  <Td>{r.responsavel}</Td>
                  <Td>{r.unidades}</Td>
                  <Td>{moeda(r.reais)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {/* Celular: lista compacta — R$ (abs.) cortava na tabela. */}
        <div className="flex flex-col gap-1 md:hidden">
          {data.divergenciaPorResponsavel.map((r) => (
            <div key={r.responsavel} className="flex items-center gap-2 border-b border-stroke/10 py-2 text-sm last:border-0">
              <div className="min-w-0 flex-1 truncate text-ink">{r.responsavel}</div>
              <div className="shrink-0 text-right">
                <div className="text-ink [font-variant-numeric:tabular-nums]">{moeda(r.reais)}</div>
                <div className="text-xs text-muted [font-variant-numeric:tabular-nums]">{r.unidades} un.</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 text-sm font-semibold text-ink">Top divergências — por valor</div>

          {/* Desktop/tablet: tabela completa. */}
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>Escopo</Th>
                  <Th>SKU</Th>
                  <Th>Dif.</Th>
                  <Th>Impacto</Th>
                </tr>
              </thead>
              <tbody>
                {data.topDivergenciasValor.map((i) => (
                  <tr key={i.itemId}>
                    <Td className="font-mono text-xs">{i.escopoCodigo}</Td>
                    <Td>{i.sku}</Td>
                    <Td className={i.diferenca >= 0 ? 'text-success' : 'text-danger'}>{i.diferenca}</Td>
                    <Td>{moeda(i.impactoReais)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Celular: lista compacta — impacto em R$ cortava na tabela. */}
          <div className="flex flex-col gap-1 md:hidden">
            {data.topDivergenciasValor.map((i) => (
              <div key={i.itemId} className="flex items-center gap-2 border-b border-stroke/10 py-2 text-sm last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-muted">{i.escopoCodigo}</div>
                  <div className="truncate text-ink">{i.sku}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-ink [font-variant-numeric:tabular-nums]">{moeda(i.impactoReais)}</div>
                  <div className={`text-xs [font-variant-numeric:tabular-nums] ${i.diferenca >= 0 ? 'text-success' : 'text-danger'}`}>
                    dif. {i.diferenca}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-2 text-sm font-semibold text-ink">Reincidência (2+ inventários seguidos divergindo)</div>
          {data.reincidencia.length === 0 ? (
            <div className="text-sm text-muted">Nenhum produto reincidente no período.</div>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {data.reincidencia.map((r) => (
                <li key={r.produtoId} className="text-ink">
                  <span className="font-mono text-xs">{r.sku}</span> — {r.nome}{' '}
                  <span className="text-danger">({r.inventariosConsecutivosDivergentes}x)</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
