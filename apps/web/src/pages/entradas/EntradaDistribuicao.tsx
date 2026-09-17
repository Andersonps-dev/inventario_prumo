import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { useEnderecos, useDistribuirEntrada } from '../../api/hooks';
import { ApiError } from '../../api/client';
import type { EntradaItem } from '../../api/types';

/**
 * Etapa de distribuição: bipa uma posição (fica fixa até trocar, mesmo
 * padrão do ContagemRapida.tsx), marca produto(s)/quantidade(s) — inclusive
 * "tudo" — e confirma numa tacada só. Só lista itens com saldo ainda a
 * distribuir (`quantidadeRecebida - quantidadeDistribuida > 0`).
 */
export function EntradaDistribuicao({
  entradaId,
  depositoId,
  itens,
}: {
  entradaId: number;
  depositoId: number;
  itens: EntradaItem[];
}) {
  const distribuir = useDistribuirEntrada();
  const { data: enderecosDoDeposito } = useEnderecos({ depositoId, ativo: true });
  const [enderecoAtualId, setEnderecoAtualId] = useState<number | null>(null);
  const [codigoEndereco, setCodigoEndereco] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const inputEnderecoRef = useRef<HTMLInputElement>(null);

  const pendentes = useMemo(
    () =>
      itens
        .map((i) => ({ item: i, restante: Number(i.quantidadeRecebida) - Number(i.quantidadeDistribuida) }))
        .filter((x) => x.restante > 0),
    [itens],
  );

  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [quantidades, setQuantidades] = useState<Record<number, string>>({});

  const enderecoAtual = enderecosDoDeposito?.find((e) => e.id === enderecoAtualId) ?? null;

  const buscarEndereco = (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    const termo = codigoEndereco.trim().toLowerCase();
    if (!termo) return;
    const endereco = enderecosDoDeposito?.find((e) => e.codigo.toLowerCase() === termo);
    if (!endereco) {
      setErro(`Nenhum endereço "${codigoEndereco}" neste depósito.`);
      return;
    }
    setEnderecoAtualId(endereco.id);
    setCodigoEndereco('');
  };

  const trocarEndereco = () => {
    setEnderecoAtualId(null);
    setMarcados(new Set());
    setQuantidades({});
    setErro(null);
    setTimeout(() => inputEnderecoRef.current?.focus(), 0);
  };

  const alternarMarcado = (itemId: number, restante: number) => {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(itemId)) {
        novo.delete(itemId);
      } else {
        novo.add(itemId);
        setQuantidades((q) => (q[itemId] !== undefined ? q : { ...q, [itemId]: String(restante) }));
      }
      return novo;
    });
  };

  const selecionarTudo = () => {
    setMarcados(new Set(pendentes.map((p) => p.item.id)));
    setQuantidades(Object.fromEntries(pendentes.map((p) => [p.item.id, String(p.restante)])));
  };

  const limparSelecao = () => {
    setMarcados(new Set());
  };

  const confirmar = async () => {
    setErro(null);
    if (!enderecoAtual || marcados.size === 0) return;
    const itensParaEnviar = pendentes
      .filter((p) => marcados.has(p.item.id))
      .map((p) => ({ produtoId: p.item.produtoId, quantidade: Number(quantidades[p.item.id] ?? p.restante) }));

    if (itensParaEnviar.some((i) => !Number.isFinite(i.quantidade) || i.quantidade <= 0)) {
      setErro('Todas as quantidades marcadas precisam ser maiores que zero.');
      return;
    }

    try {
      await distribuir.mutateAsync({ id: entradaId, enderecoId: enderecoAtual.id, itens: itensParaEnviar });
      setMarcados(new Set());
      setQuantidades({});
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível confirmar a distribuição.');
    }
  };

  if (pendentes.length === 0) {
    return (
      <div className="rounded-card border border-success/40 bg-success/10 p-4 text-sm text-success">
        Tudo já foi distribuído.
      </div>
    );
  }

  return (
    <div className="rounded-card border border-primary/30 bg-primary/5 p-4 shadow-sm md:shadow-none">
      <div className="mb-2 text-sm font-semibold text-ink">Distribuição</div>

      {!enderecoAtual ? (
        <form onSubmit={buscarEndereco} className="flex gap-2">
          <input
            ref={inputEnderecoRef}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Bipe ou digite a posição de destino"
            value={codigoEndereco}
            onChange={(e) => setCodigoEndereco(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-stroke px-3 py-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary md:py-2 md:text-sm"
          />
          <Button type="submit" variante="primaria" className="shrink-0">
            Ir
          </Button>
        </form>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md bg-ink/5 px-3 py-1.5 text-sm">
            <span className="text-ink">
              Posição atual: <span className="font-mono font-semibold">{enderecoAtual.codigo}</span>
            </span>
            <button type="button" className="text-primary hover:underline" onClick={trocarEndereco}>
              Trocar
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted">{pendentes.length} produto(s) com saldo a distribuir</span>
            <div className="flex gap-3">
              <button type="button" className="text-primary hover:underline" onClick={selecionarTudo}>
                Selecionar tudo
              </button>
              <button type="button" className="text-muted hover:underline" onClick={limparSelecao}>
                Limpar
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-md border border-stroke/30">
            {pendentes.map(({ item, restante }) => (
              <label
                key={item.id}
                className="flex flex-wrap items-center gap-2 border-b border-stroke/10 px-3 py-2 text-sm last:border-0 hover:bg-surface"
              >
                <input type="checkbox" checked={marcados.has(item.id)} onChange={() => alternarMarcado(item.id, restante)} />
                <span className="font-mono text-xs text-muted">{item.produto.sku}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{item.produto.nome}</span>
                <span className="text-xs text-muted">restante {restante}</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={restante}
                  disabled={!marcados.has(item.id)}
                  value={quantidades[item.id] ?? String(restante)}
                  onChange={(e) => setQuantidades((q) => ({ ...q, [item.id]: e.target.value }))}
                  className="w-24 rounded-md border border-stroke px-2 py-1 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-surface disabled:text-muted"
                />
              </label>
            ))}
          </div>

          <div className="mt-3">
            <Button
              type="button"
              variante="primaria"
              disabled={marcados.size === 0 || distribuir.isPending}
              onClick={confirmar}
            >
              {distribuir.isPending ? 'Confirmando…' : `Confirmar distribuição nesta posição${marcados.size > 0 ? ` (${marcados.size})` : ''}`}
            </Button>
          </div>
        </>
      )}
      {erro && <div className="mt-2 text-sm text-danger">{erro}</div>}
    </div>
  );
}
