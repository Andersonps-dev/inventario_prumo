import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useEnderecos } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { EtiquetaEndereco } from './EtiquetaEndereco';
import { VoltarLink } from '../../components/VoltarLink';
import type { Endereco } from '../../api/types';

export function EnderecosEtiquetasPage() {
  const location = useLocation();
  const enderecosIniciais = (location.state as { enderecos?: Endereco[] } | null)?.enderecos;

  const [busca, setBusca] = useState('');
  const [quantidades, setQuantidades] = useState<Record<number, number>>(() => {
    if (!enderecosIniciais) return {};
    const inicial: Record<number, number> = {};
    for (const e of enderecosIniciais) inicial[e.id] = 1;
    return inicial;
  });
  const { data } = useEnderecos({ busca: busca || undefined, ativo: true });

  const listaExibida = enderecosIniciais && !busca ? enderecosIniciais : data ?? [];

  const definirQuantidade = (enderecoId: number, quantidade: number) => {
    setQuantidades((atual) => {
      const novo = { ...atual };
      if (quantidade <= 0) delete novo[enderecoId];
      else novo[enderecoId] = quantidade;
      return novo;
    });
  };

  const etiquetas = useMemo(() => {
    const lista: { key: string; endereco: Endereco }[] = [];
    const fonte = enderecosIniciais ?? data ?? [];
    for (const endereco of fonte) {
      const qtd = quantidades[endereco.id] ?? 0;
      for (let i = 0; i < qtd; i++) {
        lista.push({ key: `${endereco.id}-${i}`, endereco });
      }
    }
    return lista;
  }, [data, enderecosIniciais, quantidades]);

  return (
    <div className="flex flex-col gap-4">
      <div className="print:hidden">
        <VoltarLink to="/enderecos" label="Endereços" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <h1 className="text-xl font-semibold text-ink">Etiquetas de endereço</h1>
        <Button variante="primaria" disabled={etiquetas.length === 0} onClick={() => window.print()}>
          Imprimir {etiquetas.length > 0 ? `(${etiquetas.length})` : ''}
        </Button>
      </div>

      <div className="print:hidden">
        <Input placeholder="Buscar endereço…" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-72" />
      </div>

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden print:hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Setor/Rua/Módulo/Nível/Vão</Th>
              <Th>Cópias</Th>
            </tr>
          </thead>
          <tbody>
            {listaExibida.map((e) => (
              <tr key={e.id}>
                <Td className="font-mono text-xs">{e.codigo}</Td>
                <Td>
                  {e.setor}/{e.rua}/{e.modulo}/{e.nivel}/{e.vao}
                </Td>
                <Td>
                  <input
                    type="number"
                    min={0}
                    value={quantidades[e.id] ?? 0}
                    onChange={(ev) => definirQuantidade(e.id, Number(ev.target.value))}
                    className="w-16 rounded-md border border-stroke/50 px-2 py-1 text-sm"
                  />
                </Td>
              </tr>
            ))}
            {listaExibida.length === 0 && (
              <tr>
                <Td className="text-muted">Nenhum endereço encontrado.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Celular: cards empilhados — o campo de cópias precisa estar sempre visível, sem depender de rolagem lateral. */}
      <div className="flex flex-col gap-2 print:hidden md:hidden">
        {listaExibida.map((e) => (
          <Card key={e.id} padding="p-3" className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-sm font-medium text-ink">{e.codigo}</div>
              <div className="truncate text-xs text-muted">
                {e.setor}/{e.rua}/{e.modulo}/{e.nivel}/{e.vao}
              </div>
            </div>
            <input
              type="number"
              min={0}
              value={quantidades[e.id] ?? 0}
              onChange={(ev) => definirQuantidade(e.id, Number(ev.target.value))}
              className="w-16 shrink-0 rounded-md border border-stroke/50 px-2 py-1.5 text-sm"
            />
          </Card>
        ))}
        {listaExibida.length === 0 && <div className="p-3 text-sm text-muted">Nenhum endereço encontrado.</div>}
      </div>

      {etiquetas.length > 0 && (
        <div className="grid grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
          {etiquetas.map((e) => (
            <EtiquetaEndereco
              key={e.key}
              codigo={e.endereco.codigo}
              setor={e.endereco.setor}
              rua={e.endereco.rua}
              modulo={e.endereco.modulo}
              nivel={e.endereco.nivel}
              vao={e.endereco.vao}
            />
          ))}
        </div>
      )}
    </div>
  );
}
