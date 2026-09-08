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

  if (isLoading || !data) return <div className="text-nevoa">Carregando…</div>;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-aco">Qualidade do inventário</h2>

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
        <div className="mb-2 text-sm font-semibold text-aco">Evolução da acuracidade por inventário</div>
        <LineChart
          rotulosEixoX={data.evolucaoAcuracidade.map((e) => e.codigo.replace('INV-', ''))}
          series={[
            { nome: 'Por item', valores: data.evolucaoAcuracidade.map((e) => e.acuraciadePorItem), cor: CATEGORICO[0] },
            { nome: 'Por valor', valores: data.evolucaoAcuracidade.map((e) => Math.max(0, e.acuraciadePorValor)), cor: CATEGORICO[1] },
          ]}
        />
      </Card>

      <Card>
        <div className="mb-2 text-sm font-semibold text-aco">Divergência por responsável de contagem</div>
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
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 text-sm font-semibold text-aco">Top divergências — por valor</div>
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
                  <Td className={i.diferenca >= 0 ? 'text-conforme' : 'text-divergente'}>{i.diferenca}</Td>
                  <Td>{moeda(i.impactoReais)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <div className="mb-2 text-sm font-semibold text-aco">Reincidência (2+ inventários seguidos divergindo)</div>
          {data.reincidencia.length === 0 ? (
            <div className="text-sm text-nevoa">Nenhum produto reincidente no período.</div>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {data.reincidencia.map((r) => (
                <li key={r.produtoId} className="text-aco">
                  <span className="font-mono text-xs">{r.sku}</span> — {r.nome}{' '}
                  <span className="text-divergente">({r.inventariosConsecutivosDivergentes}x)</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
