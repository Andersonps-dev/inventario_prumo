import { useState } from 'react';
import { useDepositos, useEnderecos, useEscopos, useRelatorioInventario } from '../../api/hooks';
import type { FiltrosRelatorio } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Field, Input, Select } from '../../components/Input';
import { Card } from '../../components/Card';
import { ExportButton } from '../../components/ExportButton';
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
          <h1 className="text-xl font-semibold text-aco">Relatório de inventário</h1>
          <p className="text-sm text-nevoa">Saldo em estoque × contagem × diferença, item a item, por data.</p>
        </div>
        <ExportButton tipo="relatorio_inventario" filtros={filtros} rotulo="Exportar relatório" />
      </div>

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
          <button className="text-xs text-latao-escuro hover:underline" onClick={() => setFiltros({})}>
            Limpar filtros
          </button>
        )}
      </Card>

      {linhas && (
        <div className="flex gap-3 text-xs text-nevoa">
          <span>
            <span className="font-semibold text-aco">{linhas.length}</span> linha(s)
          </span>
          <span>·</span>
          <span>
            <span className={`font-semibold ${totalDivergencias > 0 ? 'text-divergente' : 'text-conforme'}`}>{totalDivergencias}</span> com
            divergência
          </span>
        </div>
      )}

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
              <Td className="text-nevoa">Carregando…</Td>
            </tr>
          )}
          {linhasOrdenadas?.map((l, i) => (
            <tr key={i}>
              <Td className="whitespace-nowrap text-xs text-nevoa [font-variant-numeric:tabular-nums]">
                {new Date(l.data).toLocaleString('pt-BR')}
              </Td>
              <Td className="font-mono text-xs">{l.sku}</Td>
              <Td className="font-mono text-xs text-nevoa">{l.codigoBarras ?? '—'}</Td>
              <Td>{l.nome}</Td>
              <Td className="font-mono text-xs text-nevoa">{l.enderecoCodigo}</Td>
              <Td className="[font-variant-numeric:tabular-nums]">{l.saldoEstoque}</Td>
              <Td className="[font-variant-numeric:tabular-nums]">
                {l.contagem !== null ? l.contagem : <Badge tom="PENDENTE">pendente</Badge>}
              </Td>
              <Td
                className={`[font-variant-numeric:tabular-nums] ${
                  l.diferenca ? (l.diferenca > 0 ? 'font-semibold text-conforme' : 'font-semibold text-divergente') : ''
                }`}
              >
                {l.diferenca !== null ? (l.diferenca > 0 ? `+${l.diferenca}` : l.diferenca) : '—'}
              </Td>
            </tr>
          ))}
          {linhasOrdenadas && linhasOrdenadas.length === 0 && (
            <tr>
              <Td className="text-nevoa">Nenhuma contagem encontrada para os filtros selecionados.</Td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
