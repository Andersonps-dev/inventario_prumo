import { useMemo, useState } from 'react';
import { useProdutos } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { EtiquetaBarcode } from './EtiquetaBarcode';
import { VoltarLink } from '../../components/VoltarLink';

export function EtiquetasPage() {
  const [busca, setBusca] = useState('');
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});
  const { data } = useProdutos({ busca: busca || undefined, ativo: true, pagina: 1 });

  const definirQuantidade = (produtoId: number, quantidade: number) => {
    setQuantidades((atual) => {
      const novo = { ...atual };
      if (quantidade <= 0) delete novo[produtoId];
      else novo[produtoId] = quantidade;
      return novo;
    });
  };

  const etiquetas = useMemo(() => {
    const lista: { key: string; sku: string; nome: string }[] = [];
    for (const produto of data?.itens ?? []) {
      const qtd = quantidades[produto.id] ?? 0;
      for (let i = 0; i < qtd; i++) {
        lista.push({ key: `${produto.id}-${i}`, sku: produto.sku, nome: produto.nome });
      }
    }
    return lista;
  }, [data, quantidades]);

  return (
    <div className="flex flex-col gap-4">
      <div className="print:hidden">
        <VoltarLink to="/produtos" label="Produtos" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <h1 className="text-xl font-semibold text-ink">Etiquetas de código de barras</h1>
        <Button variante="primaria" disabled={etiquetas.length === 0} onClick={() => window.print()}>
          Imprimir {etiquetas.length > 0 ? `(${etiquetas.length})` : ''}
        </Button>
      </div>

      <div className="print:hidden">
        <Input placeholder="Buscar produto…" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-72" />
      </div>

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden print:hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>SKU</Th>
              <Th>Produto</Th>
              <Th>Cópias</Th>
            </tr>
          </thead>
          <tbody>
            {data?.itens.map((p) => (
              <tr key={p.id}>
                <Td className="font-mono text-xs">{p.sku}</Td>
                <Td>{p.nome}</Td>
                <Td>
                  <input
                    type="number"
                    min={0}
                    value={quantidades[p.id] ?? 0}
                    onChange={(e) => definirQuantidade(p.id, Number(e.target.value))}
                    className="w-16 rounded-md border border-stroke/50 px-2 py-1 text-sm"
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Celular: cards empilhados — o campo de cópias precisa estar sempre visível, sem depender de rolagem lateral. */}
      <div className="flex flex-col gap-2 print:hidden md:hidden">
        {data?.itens.map((p) => (
          <Card key={p.id} padding="p-3" className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-xs text-muted">{p.sku}</div>
              <div className="truncate text-sm text-ink">{p.nome}</div>
            </div>
            <input
              type="number"
              min={0}
              value={quantidades[p.id] ?? 0}
              onChange={(e) => definirQuantidade(p.id, Number(e.target.value))}
              className="w-16 shrink-0 rounded-md border border-stroke/50 px-2 py-1.5 text-sm"
            />
          </Card>
        ))}
        {data && data.itens.length === 0 && <div className="p-3 text-sm text-muted">Nenhum produto encontrado.</div>}
      </div>

      {etiquetas.length > 0 && (
        <div className="grid grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
          {etiquetas.map((e) => (
            <EtiquetaBarcode key={e.key} sku={e.sku} nome={e.nome} />
          ))}
        </div>
      )}
    </div>
  );
}
