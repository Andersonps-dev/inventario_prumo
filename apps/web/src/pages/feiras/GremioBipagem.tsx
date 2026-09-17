import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Button } from '../../components/Button';
import { useAtalhos } from '../../app/useAtalhos';
import { apiFetch, ApiError } from '../../api/client';
import { useAdicionarItemEvento, usePosicaoEstoque, useRegistrarRetornoItemEvento } from '../../api/hooks';
import { AdicionarItemGremioModal } from './AdicionarItemGremioModal';
import { DevolverItemGremioModal } from './DevolverItemGremioModal';
import type { EventoVendaPosicaoInfo, ItemReservaEvento, ListaProdutos } from '../../api/types';

type Modo = 'ADICIONAR' | 'DEVOLVER';

/**
 * Painel de bipagem embutido na página do grêmio. Duas "salas" bem
 * separadas visualmente (aba azul "Enviar" / aba âmbar "Devolver") em vez
 * de um toggle discreto — cada uma no seu ambiente, com sua própria lista
 * clicável (itens disponíveis pra enviar / itens já reservados aqui pra
 * devolver) além do campo de bipagem por leitor. Mesma exigência de sempre
 * bipar a posição primeiro (fica fixa até trocar) do ContagemRapida.tsx.
 */
export function GremioBipagem({
  eventoId,
  depositoId,
  posicoes,
  itensReservados,
}: {
  eventoId: number;
  depositoId: number;
  posicoes: EventoVendaPosicaoInfo[];
  itensReservados: ItemReservaEvento[];
}) {
  const adicionar = useAdicionarItemEvento();
  const devolver = useRegistrarRetornoItemEvento();
  const { data: posicaoEstoque } = usePosicaoEstoque(depositoId);
  const [modo, setModo] = useState<Modo>('ADICIONAR');
  const [enderecoAtualId, setEnderecoAtualId] = useState<number | null>(null);
  const [codigoEndereco, setCodigoEndereco] = useState('');
  const [codigo, setCodigo] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [destacadoId, setDestacadoId] = useState<number | null>(null);
  const [produtoParaAdicionar, setProdutoParaAdicionar] = useState<{
    produtoId: number;
    sku: string;
    nome: string;
    disponivel: number;
  } | null>(null);
  const [itemParaDevolver, setItemParaDevolver] = useState<{
    produtoId: number;
    sku: string;
    nome: string;
    reservado: number;
  } | null>(null);
  const inputCodigoRef = useRef<HTMLInputElement>(null);
  const inputEnderecoRef = useRef<HTMLInputElement>(null);

  const enderecoAtual = posicoes.find((p) => p.enderecoId === enderecoAtualId) ?? null;

  // Pisca a linha do item que acabou de ser bipado — dá o mesmo feedback de
  // "aconteceu" que o clique-e-modal dá, sem precisar abrir nada.
  useEffect(() => {
    if (destacadoId === null) return;
    const t = setTimeout(() => setDestacadoId(null), 1500);
    return () => clearTimeout(t);
  }, [destacadoId]);

  const itensDisponiveisAqui = useMemo(() => {
    if (!enderecoAtual || !posicaoEstoque) return [];
    return posicaoEstoque
      .filter((p) => p.endereco_id === enderecoAtual.enderecoId && p.disponivel > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [posicaoEstoque, enderecoAtual]);

  const itensReservadosAqui = useMemo(() => {
    if (!enderecoAtual) return [];
    return itensReservados.filter((r) => r.endereco_id === enderecoAtual.enderecoId).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [itensReservados, enderecoAtual]);

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
    setDestacadoId(null);
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
      const item = itensReservados.find(
        (r) =>
          r.endereco_id === enderecoAtual.enderecoId &&
          (r.sku.toLowerCase() === termo || r.codigo_barras?.toLowerCase() === termo),
      );
      if (!item) {
        setErro(`Nada reservado com SKU ou código de barras "${codigo}" na posição ${enderecoAtual.codigo}.`);
        return;
      }
      setEnviando(true);
      try {
        await devolver.mutateAsync({ id: eventoId, produtoId: item.produto_id, enderecoId: enderecoAtual.enderecoId, quantidade: quantidadeNum });
        setDestacadoId(item.produto_id);
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
      setDestacadoId(produto.id);
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
    <div className="overflow-hidden rounded-card border border-stroke shadow-sm md:shadow-none">
      {/* Duas abas grandes, cada uma sua "sala" — bem mais separado que um toggle pequeno. */}
      <div className="grid grid-cols-2">
        <button
          type="button"
          onClick={() => trocarModo('ADICIONAR')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
            modo === 'ADICIONAR' ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-ink'
          }`}
        >
          <ArrowUpFromLine size={15} />
          Enviar pro grêmio
        </button>
        <button
          type="button"
          onClick={() => trocarModo('DEVOLVER')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
            modo === 'DEVOLVER' ? 'bg-warning text-white' : 'bg-surface text-muted hover:text-ink'
          }`}
        >
          <ArrowDownToLine size={15} />
          Devolver
        </button>
      </div>

      <div className={`p-4 ${modo === 'ADICIONAR' ? 'bg-primary/5' : 'bg-warning/5'}`}>
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
              className={`min-w-0 flex-1 rounded-md border border-stroke px-3 py-3 text-base outline-none md:py-2 md:text-sm ${
                modo === 'ADICIONAR' ? 'focus:border-primary focus:ring-1 focus:ring-primary' : 'focus:border-warning focus:ring-1 focus:ring-warning'
              }`}
            />
            <Button type="submit" variante="primaria" className="shrink-0">
              Ir
            </Button>
          </form>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-2 rounded-md bg-ink/5 px-3 py-1.5 text-sm">
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
                placeholder={
                  modo === 'ADICIONAR'
                    ? 'Bipe o código de barras ou digite o SKU'
                    : 'Bipe o código de barras ou digite o SKU do que está devolvendo'
                }
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
            {erro && <div className="mt-2 text-sm text-danger">{erro}</div>}

            {modo === 'ADICIONAR' ? (
              <div className="mt-3">
                <div className="mb-1.5 text-xs font-medium text-muted">
                  Itens disponíveis nesta posição — clique pra adicionar sem bipar
                </div>
                <div className="max-h-64 overflow-y-auto rounded-md border border-stroke/40 bg-card">
                  {itensDisponiveisAqui.map((p) => (
                    <button
                      key={p.produto_id}
                      type="button"
                      onClick={() =>
                        setProdutoParaAdicionar({ produtoId: p.produto_id, sku: p.sku, nome: p.nome, disponivel: p.disponivel })
                      }
                      className={`flex w-full items-center gap-2 border-b border-stroke/10 px-3 py-2 text-left text-sm last:border-0 hover:bg-primary/10 ${
                        destacadoId === p.produto_id ? 'bg-success/15' : ''
                      }`}
                    >
                      <span className="font-mono text-xs text-muted">{p.sku}</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{p.nome}</span>
                      <span className="shrink-0 text-xs text-muted">disp. {p.disponivel}</span>
                    </button>
                  ))}
                  {itensDisponiveisAqui.length === 0 && (
                    <div className="px-3 py-3 text-sm text-muted">Nenhum produto com saldo disponível nesta posição.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <div className="mb-1.5 text-xs font-medium text-muted">
                  Itens reservados nesta posição — clique pra devolver sem bipar
                </div>
                <div className="max-h-64 overflow-y-auto rounded-md border border-stroke/40 bg-card">
                  {itensReservadosAqui.map((r) => (
                    <button
                      key={r.produto_id}
                      type="button"
                      onClick={() =>
                        setItemParaDevolver({ produtoId: r.produto_id, sku: r.sku, nome: r.nome, reservado: r.saldo })
                      }
                      className={`flex w-full items-center gap-2 border-b border-stroke/10 px-3 py-2 text-left text-sm last:border-0 hover:bg-warning/10 ${
                        destacadoId === r.produto_id ? 'bg-success/15' : ''
                      }`}
                    >
                      <span className="font-mono text-xs text-muted">{r.sku}</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{r.nome}</span>
                      <span className="shrink-0 text-xs font-semibold text-ink">{r.saldo}</span>
                    </button>
                  ))}
                  {itensReservadosAqui.length === 0 && (
                    <div className="px-3 py-3 text-sm text-muted">Nada reservado nesta posição ainda.</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {produtoParaAdicionar && enderecoAtual && (
        <AdicionarItemGremioModal
          eventoId={eventoId}
          enderecoId={enderecoAtual.enderecoId}
          enderecoCodigo={enderecoAtual.codigo}
          produto={produtoParaAdicionar}
          onClose={() => setProdutoParaAdicionar(null)}
        />
      )}
      {itemParaDevolver && enderecoAtual && (
        <DevolverItemGremioModal
          eventoId={eventoId}
          enderecoId={enderecoAtual.enderecoId}
          enderecoCodigo={enderecoAtual.codigo}
          item={itemParaDevolver}
          onClose={() => setItemParaDevolver(null)}
        />
      )}
    </div>
  );
}
