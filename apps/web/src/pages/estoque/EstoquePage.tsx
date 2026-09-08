import { useMemo, useState } from 'react';
import { useDepositos, usePosicaoEstoque } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { RowAction } from '../../components/RowActions';
import { Input, Select } from '../../components/Input';
import { useAuth } from '../../app/AuthContext';
import { useOrdenacao } from '../../app/useOrdenacao';
import { KardexModal } from './KardexModal';
import { MovimentoManualModal } from './MovimentoManualModal';
import { ExportButton } from '../../components/ExportButton';

export function EstoquePage() {
  const { temPapel } = useAuth();
  const [depositoId, setDepositoId] = useState<number | ''>('');
  const [busca, setBusca] = useState('');
  const { data: depositos } = useDepositos({ ativo: true });
  const { data: posicao, isLoading } = usePosicaoEstoque(depositoId || undefined);
  const [kardexDe, setKardexDe] = useState<{ id: number; nome: string } | null>(null);
  const [movimentando, setMovimentando] = useState(false);

  const posicaoFiltrada = useMemo(() => {
    if (!busca.trim()) return posicao;
    const termo = busca.toLowerCase();
    return posicao?.filter((p) => p.sku.toLowerCase().includes(termo) || p.nome.toLowerCase().includes(termo));
  }, [posicao, busca]);

  const { linhasOrdenadas: posicaoOrdenada, ordenacao, alternar } = useOrdenacao(posicaoFiltrada, {
    posicao: (p) => (p.endereco_interno ? '' : p.posicao),
    sku: (p) => p.sku,
    nome: (p) => p.nome,
    saldo: (p) => p.saldo,
    estoqueMinimo: (p) => p.estoque_minimo,
    valorTotal: (p) => p.valor_total,
    ultimaMovimentacao: (p) => p.ultima_movimentacao,
  });

  const produtosUnicos = useMemo(() => {
    const mapa = new Map<number, { produto_id: number; sku: string; nome: string }>();
    for (const p of posicao ?? []) {
      if (!mapa.has(p.produto_id)) mapa.set(p.produto_id, { produto_id: p.produto_id, sku: p.sku, nome: p.nome });
    }
    return [...mapa.values()];
  }, [posicao]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-aco">Posição de estoque</h1>
        <div className="flex flex-wrap gap-2">
          <ExportButton tipo="posicao_estoque" />
          {temPapel('ADMIN', 'SUPERVISOR') && <Button onClick={() => setMovimentando(true)}>Movimento manual</Button>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Buscar por SKU ou nome…" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64" />
        <Select value={depositoId} onChange={(e) => setDepositoId(e.target.value ? Number(e.target.value) : '')} className="w-56">
          <option value="">Todos os depósitos</option>
          {depositos?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome}
            </option>
          ))}
        </Select>
      </div>

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th sortKey="posicao" ordenacao={ordenacao} onSort={alternar}>
                Posição
              </Th>
              <Th sortKey="sku" ordenacao={ordenacao} onSort={alternar}>
                SKU
              </Th>
              <Th sortKey="nome" ordenacao={ordenacao} onSort={alternar}>
                Produto
              </Th>
              <Th>Un.</Th>
              <Th sortKey="saldo" ordenacao={ordenacao} onSort={alternar}>
                Saldo
              </Th>
              <Th sortKey="estoqueMinimo" ordenacao={ordenacao} onSort={alternar}>
                Mínimo
              </Th>
              <Th sortKey="valorTotal" ordenacao={ordenacao} onSort={alternar}>
                Valor a custo
              </Th>
              <Th sortKey="ultimaMovimentacao" ordenacao={ordenacao} onSort={alternar}>
                Última movimentação
              </Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <Td className="text-nevoa">Carregando…</Td>
              </tr>
            )}
            {posicaoOrdenada?.map((p) => (
              <tr key={`${p.produto_id}-${p.endereco_id}`}>
                <Td className="font-mono text-xs text-nevoa">{p.endereco_interno ? '—' : p.posicao}</Td>
                <Td className="font-mono text-xs">{p.sku}</Td>
                <Td>{p.nome}</Td>
                <Td>{p.unidade}</Td>
                <Td>{p.saldo}</Td>
                <Td>{p.estoque_minimo}</Td>
                <Td>{p.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Td>
                <Td className="text-xs text-nevoa">
                  {p.ultima_movimentacao ? new Date(p.ultima_movimentacao).toLocaleString('pt-BR') : '—'}
                </Td>
                <Td>
                  <RowAction onClick={() => setKardexDe({ id: p.produto_id, nome: p.nome })}>Kardex</RowAction>
                </Td>
              </tr>
            ))}
            {posicaoOrdenada && posicaoOrdenada.length === 0 && (
              <tr>
                <Td className="text-nevoa">Nenhuma posição encontrada.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Celular: cards empilhados — sem rolagem lateral pra alcançar o Kardex. */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && <div className="text-sm text-nevoa">Carregando…</div>}
        {posicaoOrdenada?.map((p) => (
          <Card key={`${p.produto_id}-${p.endereco_id}`} padding="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-xs text-nevoa">{p.sku}</div>
                <div className="truncate text-sm font-medium text-aco">{p.nome}</div>
                {!p.endereco_interno && <div className="font-mono text-[11px] text-latao-escuro">{p.posicao}</div>}
              </div>
              <div className="shrink-0 text-right text-xs text-nevoa">
                Valor
                <div className="text-sm font-semibold text-aco">{p.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-concreto py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-nevoa">Un.</div>
                <div className="text-sm font-semibold text-aco">{p.unidade}</div>
              </div>
              <div className="rounded-md bg-concreto py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-nevoa">Saldo</div>
                <div className="text-sm font-semibold text-aco [font-variant-numeric:tabular-nums]">{p.saldo}</div>
              </div>
              <div className="rounded-md bg-concreto py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-nevoa">Mínimo</div>
                <div className="text-sm font-semibold text-aco [font-variant-numeric:tabular-nums]">{p.estoque_minimo}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-nevoa">
              <span>{p.ultima_movimentacao ? new Date(p.ultima_movimentacao).toLocaleString('pt-BR') : 'Sem movimentação'}</span>
              <RowAction onClick={() => setKardexDe({ id: p.produto_id, nome: p.nome })}>Kardex</RowAction>
            </div>
          </Card>
        ))}
        {posicaoOrdenada && posicaoOrdenada.length === 0 && <div className="p-3 text-sm text-nevoa">Nenhuma posição encontrada.</div>}
      </div>

      {kardexDe && <KardexModal produtoId={kardexDe.id} nome={kardexDe.nome} onClose={() => setKardexDe(null)} />}
      {movimentando && <MovimentoManualModal produtos={produtosUnicos} onClose={() => setMovimentando(false)} />}
    </div>
  );
}
