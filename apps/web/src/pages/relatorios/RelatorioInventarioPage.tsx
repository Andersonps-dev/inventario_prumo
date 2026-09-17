import { useState } from 'react';
import { useDepositos, useEnderecos, useEscopos, useRelatorioInventario } from '../../api/hooks';
import type { FiltrosRelatorio } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Field, Input, Select } from '../../components/Input';
import { Card } from '../../components/Card';
import { ExportButton } from '../../components/ExportButton';
import { FiltrosPanel } from '../../components/FiltrosPanel';
import { useOrdenacao } from '../../app/useOrdenacao';

export function RelatorioInventarioPage() {
  const [filtros, setFiltros] = useState<FiltrosRelatorio>({});
  const { data: linhas, isLoading } = useRelatorioInventario(filtros);
  const { data: depositos } = useDepositos();
  const { data: escopos } = useEscopos();
  const { data: enderecos } = useEnderecos({ depositoId: filtros.depositoId });

  const totalDivergencias = linhas?.filter((l) => l.diferenca !== null && l.diferenca !== 0).length ?? 0;

  const { linhasOrdenadas, ordenacao, alternar } = useOrdenacao(linhas, {
    data: (l) => l.data,
    sku: (l) => l.sku,
    codigoBarras: (l) => l.codigoBarras,
    nome: (l) => l.nome,
    endereco: (l) => l.enderecoCodigo,
    saldoEstoque: (l) => l.saldoEstoque,
    contagem: (l) => l.contagem,
    diferenca: (l) => l.diferenca,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Relatório de inventário</h1>
          <p className="text-sm text-muted">Saldo em estoque × contagem × diferença, item a item, por data.</p>
        </div>
        <ExportButton tipo="relatorio_inventario" filtros={filtros} rotulo="Exportar relatório" />
      </div>

      <FiltrosPanel
        ativos={[filtros.depositoId, filtros.escopoId, filtros.enderecoId, filtros.dataInicio, filtros.dataFim].filter(Boolean).length}
      >
        <Card padding="p-3" className="flex flex-wrap items-end gap-3">
          <Field label="Depósito">
            <Select
              value={filtros.depositoId ?? ''}
              onChange={(e) => setFiltros({ ...filtros, depositoId: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Todos</option>
              {depositos?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Escopo">
            <Select
              value={filtros.escopoId ?? ''}
              onChange={(e) => setFiltros({ ...filtros, escopoId: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Todos</option>
              {escopos?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} — {e.titulo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Endereço">
            <Select
              value={filtros.enderecoId ?? ''}
              onChange={(e) => setFiltros({ ...filtros, enderecoId: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Todos</option>
              {enderecos?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="De">
            <Input type="date" value={filtros.dataInicio ?? ''} onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value || undefined })} />
          </Field>
          <Field label="Até">
            <Input type="date" value={filtros.dataFim ?? ''} onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value || undefined })} />
          </Field>
          {(filtros.depositoId || filtros.escopoId || filtros.enderecoId || filtros.dataInicio || filtros.dataFim) && (
            <button className="text-xs text-primary hover:underline" onClick={() => setFiltros({})}>
              Limpar filtros
            </button>
          )}
        </Card>
      </FiltrosPanel>

      {linhas && (
        <div className="flex gap-3 text-xs text-muted">
          <span>
            <span className="font-semibold text-ink">{linhas.length}</span> linha(s)
          </span>
          <span>·</span>
          <span>
            <span className={`font-semibold ${totalDivergencias > 0 ? 'text-danger' : 'text-success'}`}>{totalDivergencias}</span> com
            divergência
          </span>
        </div>
      )}

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th sortKey="data" ordenacao={ordenacao} onSort={alternar}>
                Data
              </Th>
              <Th sortKey="sku" ordenacao={ordenacao} onSort={alternar}>
                SKU
              </Th>
              <Th sortKey="codigoBarras" ordenacao={ordenacao} onSort={alternar}>
                Código de barras
              </Th>
              <Th sortKey="nome" ordenacao={ordenacao} onSort={alternar}>
                Produto
              </Th>
              <Th sortKey="endereco" ordenacao={ordenacao} onSort={alternar}>
                Endereço
              </Th>
              <Th sortKey="saldoEstoque" ordenacao={ordenacao} onSort={alternar}>
                Saldo em estoque
              </Th>
              <Th sortKey="contagem" ordenacao={ordenacao} onSort={alternar}>
                Contagem
              </Th>
              <Th sortKey="diferenca" ordenacao={ordenacao} onSort={alternar}>
                Diferença
              </Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <Td className="text-muted">Carregando…</Td>
              </tr>
            )}
            {linhasOrdenadas?.map((l, i) => (
              <tr key={i}>
                <Td className="whitespace-nowrap text-xs text-muted [font-variant-numeric:tabular-nums]">
                  {new Date(l.data).toLocaleString('pt-BR')}
                </Td>
                <Td className="font-mono text-xs">{l.sku}</Td>
                <Td className="font-mono text-xs text-muted">{l.codigoBarras ?? '—'}</Td>
                <Td>{l.nome}</Td>
                <Td className="font-mono text-xs text-muted">{l.enderecoCodigo}</Td>
                <Td className="[font-variant-numeric:tabular-nums]">{l.saldoEstoque}</Td>
                <Td className="[font-variant-numeric:tabular-nums]">
                  {l.contagem !== null ? l.contagem : <Badge tom="PENDENTE">pendente</Badge>}
                </Td>
                <Td
                  className={`[font-variant-numeric:tabular-nums] ${
                    l.diferenca ? (l.diferenca > 0 ? 'font-semibold text-success' : 'font-semibold text-danger') : ''
                  }`}
                >
                  {l.diferenca !== null ? (l.diferenca > 0 ? `+${l.diferenca}` : l.diferenca) : '—'}
                </Td>
              </tr>
            ))}
            {linhasOrdenadas && linhasOrdenadas.length === 0 && (
              <tr>
                <Td className="text-muted">Nenhuma contagem encontrada para os filtros selecionados.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Celular: cards empilhados — 8 colunas não cabem, código de barras fica só no desktop/export. */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && <div className="text-sm text-muted">Carregando…</div>}
        {linhasOrdenadas?.map((l, i) => (
          <Card key={i} padding="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted">{l.sku}</div>
                <div className="truncate text-sm font-medium text-ink">{l.nome}</div>
                <div className="font-mono text-[11px] text-warning">{l.enderecoCodigo}</div>
              </div>
              <div className="shrink-0 text-right text-[11px] text-muted [font-variant-numeric:tabular-nums]">
                {new Date(l.data).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Saldo</div>
                <div className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">{l.saldoEstoque}</div>
              </div>
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Contagem</div>
                <div className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">
                  {l.contagem !== null ? l.contagem : <Badge tom="PENDENTE">pendente</Badge>}
                </div>
              </div>
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Diferença</div>
                <div
                  className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${
                    l.diferenca ? (l.diferenca > 0 ? 'text-success' : 'text-danger') : 'text-ink'
                  }`}
                >
                  {l.diferenca !== null ? (l.diferenca > 0 ? `+${l.diferenca}` : l.diferenca) : '—'}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {linhasOrdenadas && linhasOrdenadas.length === 0 && (
          <div className="p-3 text-sm text-muted">Nenhuma contagem encontrada para os filtros selecionados.</div>
        )}
      </div>
    </div>
  );
}
