import { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { useAtalhos } from '../../app/useAtalhos';
import { apiFetch, ApiError } from '../../api/client';
import { useBiparEntrada } from '../../api/hooks';
import type { ListaProdutos } from '../../api/types';

/** Bipagem do que chegou na nota — sem posição ainda (mercadoria nova, não existe estoque prévio pra checar), cada bipe soma. */
export function EntradaBipagem({ entradaId }: { entradaId: number }) {
  const bipar = useBiparEntrada();
  const [codigo, setCodigo] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useAtalhos({
    Escape: () => {
      setCodigo('');
      setQuantidade('');
      setErro(null);
    },
  });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    const termo = codigo.trim().toLowerCase();
    if (!termo) return;

    const quantidadeNum = quantidade.trim() === '' ? 1 : Number(quantidade);
    if (!Number.isFinite(quantidadeNum) || quantidadeNum <= 0) {
      setErro('Quantidade precisa ser maior que zero.');
      return;
    }

    setBuscando(true);
    try {
      const resultado = await apiFetch<ListaProdutos>(`/produtos?busca=${encodeURIComponent(codigo.trim())}&ativo=true&pagina=1`);
      const produto = resultado.itens.find((p) => p.sku.toLowerCase() === termo || p.codigoBarras?.toLowerCase() === termo);
      if (!produto) {
        setErro(`Nenhum produto com SKU ou código de barras "${codigo}" encontrado no catálogo.`);
        return;
      }
      await bipar.mutateAsync({ id: entradaId, produtoId: produto.id, quantidade: quantidadeNum });
      setCodigo('');
      setQuantidade('');
      inputRef.current?.focus();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível bipar o item.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="rounded-card border border-primary/30 bg-primary/5 p-4 shadow-sm md:shadow-none">
      <div className="mb-2 text-sm font-semibold text-ink">Bipagem do recebido</div>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Bipe o código de barras ou digite o SKU e pressione Enter"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-stroke px-3 py-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary md:py-2 md:text-sm"
        />
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          placeholder="Qtd. (padrão 1)"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          className="w-full rounded-md border border-stroke px-3 py-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:w-32 md:py-2 md:text-sm"
        />
        <Button type="submit" variante="primaria" disabled={buscando || bipar.isPending} className="shrink-0">
          {buscando ? 'Buscando…' : bipar.isPending ? 'Somando…' : 'Bipar'}
        </Button>
      </form>
      {erro && <div className="mt-2 text-sm text-danger">{erro}</div>}
    </div>
  );
}
