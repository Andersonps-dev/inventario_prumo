import { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { useAtalhos } from '../../app/useAtalhos';
import { apiFetch, ApiError } from '../../api/client';
import { useAdicionarItemEvento, useRegistrarRetornoItemEvento } from '../../api/hooks';
import type { EventoVendaPosicaoInfo, ItemReservaEvento, ListaProdutos } from '../../api/types';

type Modo = 'ADICIONAR' | 'DEVOLVER';

/**
 * Painel de bipagem embutido na página do grêmio — substitui os antigos
 * modais de carrinho (AdicionarItensFeiraModal/RetornoFeiraModal). Mesmo
 * padrão do ContagemRapida.tsx do inventário: bipa a posição primeiro (aqui
 * sempre exigido, mesmo com uma posição só, porque a posição sempre importa
 * pra saber de onde reservar/devolver), fica fixa até trocar, depois bipa
 * produto — cada bipe soma 1, ou a quantidade digitada. Um toggle troca só
 * qual mutação o mesmo formulário chama.
 */
export function GremioBipagem({
  eventoId,
  posicoes,
  itensReservados,
}: {
  eventoId: number;
  posicoes: EventoVendaPosicaoInfo[];
  itensReservados: ItemReservaEvento[];
}) {
  const adicionar = useAdicionarItemEvento();
  const devolver = useRegistrarRetornoItemEvento();
  const [modo, setModo] = useState<Modo>('ADICIONAR');
  const [enderecoAtualId, setEnderecoAtualId] = useState<number | null>(null);
  const [codigoEndereco, setCodigoEndereco] = useState('');
  const [codigo, setCodigo] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputCodigoRef = useRef<HTMLInputElement>(null);
  const inputEnderecoRef = useRef<HTMLInputElement>(null);

  const enderecoAtual = posicoes.find((p) => p.enderecoId === enderecoAtualId) ?? null;

  const limpar = () => {
    setCodigo('');
    setQuantidade('');
    setErro(null);
  };

  useAtalhos({ Escape: limpar });

  const trocarEndereco = () => {
    setEnderecoAtualId(null);
    limpar();
    setTimeout(() => inputEnderecoRef.current?.focus(), 0);
  };

  const trocarModo = (novo: Modo) => {
    setModo(novo);
    limpar();
  };

  const buscarEndereco = (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    const termo = codigoEndereco.trim().toLowerCase();
    if (!termo) return;
    const endereco = posicoes.find((p) => p.codigo.toLowerCase() === termo);
    if (!endereco) {
      setErro(`"${codigoEndereco}" não é uma posição habilitada deste grêmio.`);
      return;
    }
    setEnderecoAtualId(endereco.enderecoId);
    setCodigoEndereco('');
    setTimeout(() => inputCodigoRef.current?.focus(), 0);
  };

  const bipar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!enderecoAtual) return;
    const termo = codigo.trim().toLowerCase();
    if (!termo) return;

    const quantidadeNum = quantidade.trim() === '' ? 1 : Number(quantidade);
    if (!Number.isFinite(quantidadeNum) || quantidadeNum <= 0) {
      setErro('Quantidade precisa ser maior que zero.');
      return;
    }

    if (modo === 'DEVOLVER') {
      const item = itensReservados.find((r) => r.endereco_id === enderecoAtual.enderecoId && r.sku.toLowerCase() === termo);
      if (!item) {
        setErro(`Nada reservado com SKU "${codigo}" na posição ${enderecoAtual.codigo}.`);
        return;
      }
      setEnviando(true);
      try {
        await devolver.mutateAsync({ id: eventoId, produtoId: item.produto_id, enderecoId: enderecoAtual.enderecoId, quantidade: quantidadeNum });
        limpar();
        inputCodigoRef.current?.focus();
      } catch (e) {
        setErro(e instanceof ApiError ? e.message : 'Não foi possível registrar o retorno.');
      } finally {
        setEnviando(false);
      }
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
      setEnviando(true);
      await adicionar.mutateAsync({ id: eventoId, produtoId: produto.id, enderecoId: enderecoAtual.enderecoId, quantidade: quantidadeNum });
      limpar();
      inputCodigoRef.current?.focus();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível adicionar o item.');
    } finally {
      setBuscando(false);
      setEnviando(false);
    }
  };

  if (posicoes.length === 0) {
    return (
      <div className="rounded-card border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
        Este grêmio ainda não tem nenhuma posição habilitada — adicione uma posição antes de bipar produtos.
      </div>
    );
  }

  return (
    <div className="rounded-card border border-primary/30 bg-primary/5 p-4 shadow-sm md:shadow-none">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-ink">Bipagem do grêmio</div>
        <div className="flex overflow-hidden rounded-md border border-stroke">
          <button
            type="button"
            onClick={() => trocarModo('ADICIONAR')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${modo === 'ADICIONAR' ? 'bg-primary text-white' : 'bg-card text-ink hover:bg-surface'}`}
          >
            Adicionar
          </button>
          <button
            type="button"
            onClick={() => trocarModo('DEVOLVER')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${modo === 'DEVOLVER' ? 'bg-primary text-white' : 'bg-card text-ink hover:bg-surface'}`}
          >
            Devolver
          </button>
        </div>
      </div>

      {!enderecoAtual ? (
        <form onSubmit={buscarEndereco} className="flex gap-2">
          <input
            ref={inputEnderecoRef}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Bipe ou digite a posição (ex.: EN-900-00-1-0)"
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
          <form onSubmit={bipar} className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={inputCodigoRef}
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={modo === 'ADICIONAR' ? 'Bipe o código de barras ou digite o SKU' : 'Bipe o SKU do que está devolvendo'}
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
            <Button type="submit" variante="primaria" disabled={buscando || enviando} className="shrink-0">
              {buscando ? 'Buscando…' : enviando ? 'Salvando…' : 'Bipar'}
            </Button>
          </form>
        </>
      )}
      {erro && <div className="mt-2 text-sm text-danger">{erro}</div>}
    </div>
  );
}
