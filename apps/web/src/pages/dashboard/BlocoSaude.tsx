import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSaudeEstoque } from '../../api/hooks';
import { apiFetch } from '../../api/client';
import { StatCard } from '../../components/charts/StatCard';
import { BarChart } from '../../components/charts/BarChart';
import { Table, Th, Td } from '../../components/Table';
import { Card } from '../../components/Card';
import { ORDINAL_AZUL } from '../../theme/chart-tokens';
import type { FiltrosDashboard } from '../../api/hooks';

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function BlocoSaude({ filtros }: { filtros: FiltrosDashboard }) {
  const navigate = useNavigate();
  const { data, isLoading } = useSaudeEstoque(filtros);
  const [mostrarSemMovimento, setMostrarSemMovimento] = useState(false);
  const { data: semMovimento } = useQuery({
    queryKey: ['dashboard', 'sem-movimento'],
    queryFn: () => apiFetch<{ produto_id: number; sku: string; nome: string }[]>('/dashboard/sem-movimento'),
    enabled: mostrarSemMovimento,
  });

  if (isLoading || !data) return <div className="text-muted">Carregando…</div>;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Saúde do estoque</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard rotulo="Valor total a custo" valor={moeda(data.valorTotalCusto)} />
        <StatCard rotulo="SKUs ativos" valor={data.skusAtivos} aoClicar={() => navigate('/produtos')} />
        <StatCard
          rotulo="SKUs zerados"
          valor={data.skusZerados}
          destaque={data.skusZerados > 0 ? 'negativo' : 'neutro'}
          aoClicar={() => navigate('/produtos')}
        />
        <StatCard
          rotulo="Abaixo do mínimo"
          valor={data.skusAbaixoDoMinimo}
          destaque={data.skusAbaixoDoMinimo > 0 ? 'negativo' : 'neutro'}
          aoClicar={() => navigate('/produtos?abaixoDoMinimo=true')}
        />
        <StatCard
          rotulo="Sem movimento > 90d"
          valor={data.semMovimento90d}
          destaque={data.semMovimento90d > 0 ? 'negativo' : 'neutro'}
          aoClicar={() => setMostrarSemMovimento((v) => !v)}
        />
      </div>

      {mostrarSemMovimento && semMovimento && (
        <Card padding="p-3" className="text-sm">
          <div className="mb-2 font-medium text-ink">Capital parado — sem movimento há mais de 90 dias</div>
          {semMovimento.length === 0 ? (
            <div className="text-muted">Nenhum produto nessa situação.</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {semMovimento.map((p) => (
                <li key={p.produto_id} className="text-ink">
                  <span className="font-mono text-xs">{p.sku}</span> — {p.nome}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 text-sm font-semibold text-ink">Curva ABC por valor</div>
          <BarChart
            dados={data.curvaAbc.map((c) => ({
              rotulo: `Classe ${c.classe}`,
              valor: c.valor,
              cor: ORDINAL_AZUL[c.classe as 'A' | 'B' | 'C'],
              detalhe: `${c.quantidadeSkus} SKU(s) · ${c.percentualDoValor.toFixed(0)}%`,
            }))}
            formatarValor={moeda}
          />
        </Card>

        <Card>
          <div className="mb-2 text-sm font-semibold text-ink">Top 10 — valor imobilizado</div>
          <Table>
            <thead>
              <tr>
                <Th>SKU</Th>
                <Th>Produto</Th>
                <Th>Saldo</Th>
                <Th>Valor</Th>
              </tr>
            </thead>
            <tbody>
              {data.top10ValorImobilizado.map((p) => (
                <tr key={p.produtoId}>
                  <Td className="font-mono text-xs">{p.sku}</Td>
                  <Td>{p.nome}</Td>
                  <Td>{p.saldo}</Td>
                  <Td>{moeda(p.valor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </section>
  );
}
