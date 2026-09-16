import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdicionarItens, useEnderecos, useRegistrarContagem } from '../../api/hooks';
import { Button } from '../../components/Button';
import { useAtalhos } from '../../app/useAtalhos';
import { apiFetch, ApiError } from '../../api/client';
import { enfileirarContagem, listarPendentes, sincronizarFila, type ContagemPendente } from '../../offline/filaContagem';
import type { EscopoItem, ListaProdutos, Produto } from '../../api/types';

export function ContagemRapida({
  escopoId,
  depositoId,
  itens,
  enderecoIdsAlvo,
}: {
  escopoId: number;
  depositoId: number;
  itens: EscopoItem[];
  enderecoIdsAlvo?: number[];
}) {
  const registrar = useRegistrarContagem();
  const adicionar = useAdicionarItens();
  const queryClient = useQueryClient();
  const [codigo, setCodigo] = useState('');
  const [itemAlvo, setItemAlvo] = useState<EscopoItem | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [avisoSincronizacao, setAvisoSincronizacao] = useState<string | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [pendentes, setPendentes] = useState(0);
  const sincronizando = useRef(false);
  const [enderecoAtualId, setEnderecoAtualId] = useState<number | null>(null);
  const [codigoEndereco, setCodigoEndereco] = useState('');
  const [produtoParaAdicionar, setProdutoParaAdicionar] = useState<Produto | null>(null);
  const [buscandoProduto, setBuscandoProduto] = useState(false);
  const inputCodigoRef = useRef<HTMLInputElement>(null);
  const inputQuantidadeRef = useRef<HTMLInputElement>(null);
  const inputEnderecoRef = useRef<HTMLInputElement>(null);

  // Endereços já com item neste escopo.
  const enderecosDoEscopo = useMemo(() => {
    const mapa = new Map<number, { id: number; codigo: string; interno: boolean }>();
    for (const item of itens) {
      if (item.status === 'CANCELADO') continue;
      if (!mapa.has(item.enderecoId)) mapa.set(item.enderecoId, item.endereco);
    }
    return [...mapa.values()];
  }, [itens]);

  // Endereços reais do depósito — só usado para resolver código/situação dos
  // endereços-alvo do critério (abaixo) que ainda não têm nenhum item.
  const { data: enderecosDoDeposito } = useEnderecos({ depositoId, ativo: true });

  // Une os endereços já com item aos endereços-alvo do critério "por
  // endereço" do escopo, mesmo que ainda vazios — sem isso, um endereço
  // recém-gerado e nunca contado nem aparece para o usuário "chegar" nele.
  const enderecosCandidatos = useMemo(() => {
    const mapa = new Map<number, { id: number; codigo: string; interno: boolean }>();
    for (const e of enderecosDoEscopo) mapa.set(e.id, e);
    if (enderecoIdsAlvo && enderecosDoDeposito) {
      for (const id of enderecoIdsAlvo) {
        if (mapa.has(id)) continue;
        const e = enderecosDoDeposito.find((d) => d.id === id);
        if (e) mapa.set(e.id, { id: e.id, codigo: e.codigo, interno: e.interno });
      }
    }
    return [...mapa.values()];
  }, [enderecosDoEscopo, enderecoIdsAlvo, enderecosDoDeposito]);

  // A contagem sempre começa bipando o endereço físico, nunca direto pelo
  // SKU — mesmo quando o escopo só tem um endereço candidato. Sem essa
  // exigência, um escopo com um único endereço (ex.: o sentinela "sem
  // endereço" de um depósito) selecionava sozinho e pulava a etapa,
  // deixando o operador contar sem nunca confirmar onde está.
  const exigeSelecaoDeEndereco = enderecosCandidatos.length > 0;

  const enderecoAtual = enderecosCandidatos.find((e) => e.id === enderecoAtualId) ?? null;

  const atualizarPendentes = useCallback(() => {
    listarPendentes().then((lista) => setPendentes(lista.filter((p) => p.escopoId === escopoId).length));
  }, [escopoId]);

  const sincronizar = useCallback(async () => {
    // O navegador pode disparar "online" mais de uma vez na mesma
    // reconexão — sem essa trava, duas chamadas concorrentes daqui
    // reenviam o mesmo item pendente ao mesmo tempo (mesma corrida que a
    // trava de linha no backend cobre pro caso de duas abas).
    if (sincronizando.current) return;
    sincronizando.current = true;
    try {
      const { falharam } = await sincronizarFila(async (item) => {
        await registrar.mutateAsync({ escopoId: item.escopoId, escopoItemId: item.escopoItemId, quantidade: item.quantidade });
      });
      if (falharam.length > 0) {
        setAvisoSincronizacao(
          `${falharam.length} contagem(ns) feita(s) offline não puderam ser salvas (o item pode ter sido removido ou o escopo mudou de status enquanto você estava offline) — confira e conte de novo: ${falharam
            .map((f) => f.sku)
            .join(', ')}.`,
        );
      }
      atualizarPendentes();
      queryClient.invalidateQueries({ queryKey: ['escopos', escopoId] });
    } finally {
      sincronizando.current = false;
    }
  }, [registrar, atualizarPendentes, queryClient, escopoId]);

  useEffect(() => {
    atualizarPendentes();
    const aoFicarOnline = () => {
      setOffline(false);
      sincronizar();
    };
    const aoFicarOffline = () => setOffline(true);
    window.addEventListener('online', aoFicarOnline);
    window.addEventListener('offline', aoFicarOffline);
    return () => {
      window.removeEventListener('online', aoFicarOnline);
      window.removeEventListener('offline', aoFicarOffline);
    };
  }, [atualizarPendentes, sincronizar]);

  const cancelar = useCallback(() => {
    setItemAlvo(null);
    setProdutoParaAdicionar(null);
    setCodigo('');
    inputCodigoRef.current?.focus();
  }, []);

  useAtalhos({ Escape: cancelar });

  const buscarEndereco = (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    const termo = codigoEndereco.trim().toLowerCase();
    if (!termo) return;
    const endereco = enderecosCandidatos.find((e) => e.codigo.toLowerCase() === termo);
    if (!endereco) {
      setErro(`Nenhum endereço "${codigoEndereco}" neste escopo.`);
      return;
    }
    setEnderecoAtualId(endereco.id);
    setCodigoEndereco('');
    setTimeout(() => inputCodigoRef.current?.focus(), 0);
  };

  const trocarEndereco = () => {
    setEnderecoAtualId(null);
    setItemAlvo(null);
    setProdutoParaAdicionar(null);
    setCodigo('');
    setErro(null);
    setTimeout(() => inputEnderecoRef.current?.focus(), 0);
  };

  const buscar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    setProdutoParaAdicionar(null);
    const termo = codigo.trim().toLowerCase();
    if (!termo) return;

    const bate = (sku: string, codigoBarras: string | null) => sku.toLowerCase() === termo || codigoBarras?.toLowerCase() === termo;

    const candidatos = itens.filter((i) => i.status !== 'CANCELADO' && bate(i.produto.sku, i.produto.codigoBarras));
    const item = enderecoAtual ? candidatos.find((i) => i.enderecoId === enderecoAtual.id) : candidatos[0];
    if (item) {
      setItemAlvo(item);
      setQuantidade('');
      setTimeout(() => inputQuantidadeRef.current?.focus(), 0);
      return;
    }

    if (!enderecoAtual) {
      setErro(`Nenhum item pendente com SKU ou código de barras "${codigo}" neste escopo.`);
      return;
    }

    // Não há item para este SKU/código de barras neste endereço — pode ser
    // um produto encontrado fisicamente aqui que o sistema ainda não
    // associa a este local. Busca no catálogo para oferecer adicioná-lo e
    // contar na hora.
    setBuscandoProduto(true);
    try {
      const resultado = await apiFetch<ListaProdutos>(`/produtos?busca=${encodeURIComponent(codigo.trim())}&ativo=true&pagina=1`);
      const produto = resultado.itens.find((p) => bate(p.sku, p.codigoBarras));
      if (produto) {
        setProdutoParaAdicionar(produto);
      } else {
        setErro(`Nenhum produto com SKU ou código de barras "${codigo}" encontrado no catálogo.`);
      }
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível buscar o produto.');
    } finally {
      setBuscandoProduto(false);
    }
  };

  const confirmarAdicaoAqui = async () => {
    if (!produtoParaAdicionar || !enderecoAtual) return;
    setErro(null);
    try {
      const resultado = await adicionar.mutateAsync({
        id: escopoId,
        body: { produtoIds: [produtoParaAdicionar.id], enderecoId: enderecoAtual.id },
      });
      const novoItem = resultado.itens[0];
      setProdutoParaAdicionar(null);
      setCodigo('');
      if (novoItem) {
        setItemAlvo(novoItem);
        setQuantidade('');
        setTimeout(() => inputQuantidadeRef.current?.focus(), 0);
      }
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível adicionar o item.');
    }
  };

  const confirmar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!itemAlvo || quantidade === '') return;
    setErro(null);

    const pendente: Omit<ContagemPendente, 'id'> = {
      escopoId,
      escopoItemId: itemAlvo.id,
      quantidade: Number(quantidade),
      sku: itemAlvo.produto.sku,
      nomeProduto: itemAlvo.produto.nome,
      criadoEm: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      await enfileirarContagem(pendente);
      atualizarPendentes();
    } else {
      try {
        await registrar.mutateAsync({ escopoId, escopoItemId: itemAlvo.id, quantidade: Number(quantidade) });
      } catch (e) {
        if (e instanceof ApiError) {
          // O backend respondeu e recusou de propósito (item cancelado,
          // escopo mudou de status, etc.) — reenviar depois nunca vai
          // funcionar. Mostra o erro e mantém o item selecionado, em vez de
          // empurrar pra fila offline e deixar o operador achar que só
          // ficou "pendente de sincronizar".
          setErro(e.message);
          return;
        }
        // Falha de rede de verdade (offline "mentiroso", instabilidade) — não perde a contagem.
        await enfileirarContagem(pendente);
        atualizarPendentes();
      }
    }

    setItemAlvo(null);
    setCodigo('');
    setQuantidade('');
    inputCodigoRef.current?.focus();
  };

  return (
    <div className="rounded-card border border-primary/30 bg-primary/5 p-4 shadow-sm md:shadow-none">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
        <div className="text-sm font-semibold text-ink">Contagem rápida (leitor de código de barras)</div>
        {offline && (
          <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
            Offline — contagens ficam salvas no aparelho
          </span>
        )}
        {!offline && pendentes > 0 && (
          <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
            Sincronizando {pendentes} pendente(s)…
          </span>
        )}
      </div>

      {avisoSincronizacao && (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-md border border-danger/30 bg-danger/5 p-2 text-xs text-danger">
          <span>{avisoSincronizacao}</span>
          <button type="button" className="shrink-0 font-semibold hover:underline" onClick={() => setAvisoSincronizacao(null)}>
            Ok
          </button>
        </div>
      )}

      {exigeSelecaoDeEndereco && !enderecoAtual ? (
        <form onSubmit={buscarEndereco} className="flex gap-2">
          <input
            ref={inputEnderecoRef}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Bipe ou digite o endereço (ex.: EN-900-00-1-0)"
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
          {enderecoAtual && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-md bg-ink/5 px-3 py-1.5 text-sm">
              <span className="text-ink">
                Endereço atual: <span className="font-mono font-semibold">{enderecoAtual.codigo}</span>
              </span>
              {exigeSelecaoDeEndereco && (
                <button type="button" className="text-primary hover:underline" onClick={trocarEndereco}>
                  Trocar
                </button>
              )}
            </div>
          )}
          {itemAlvo ? (
            <form onSubmit={confirmar} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="text-sm text-ink">
                <span className="font-mono font-semibold">{itemAlvo.produto.sku}</span> — {itemAlvo.produto.nome}
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputQuantidadeRef}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="Quantidade"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full min-w-0 flex-1 rounded-md border border-stroke px-3 py-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:w-32 sm:flex-none md:py-2 md:text-sm"
                />
                <Button type="submit" variante="primaria" disabled={registrar.isPending} className="flex-1 sm:flex-none">
                  Confirmar <span className="hidden sm:inline">(Enter)</span>
                </Button>
                <Button type="button" onClick={cancelar} className="flex-1 sm:flex-none">
                  Cancelar <span className="hidden sm:inline">(Esc)</span>
                </Button>
              </div>
            </form>
          ) : produtoParaAdicionar && enderecoAtual ? (
            <div className="flex flex-col gap-2 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
              <div className="text-ink">
                <span className="font-mono font-semibold">{produtoParaAdicionar.sku}</span> — {produtoParaAdicionar.nome} não
                consta no endereço <span className="font-mono font-semibold">{enderecoAtual.codigo}</span> no sistema.
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variante="primaria"
                  disabled={adicionar.isPending}
                  onClick={confirmarAdicaoAqui}
                  className="flex-1 sm:flex-none"
                >
                  {adicionar.isPending ? 'Adicionando…' : 'Encontrei aqui — adicionar e contar'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setProdutoParaAdicionar(null);
                    setCodigo('');
                    inputCodigoRef.current?.focus();
                  }}
                  className="flex-1 sm:flex-none"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={buscar} className="flex gap-2">
              <input
                ref={inputCodigoRef}
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="Bipe o código de barras ou digite o SKU e pressione Enter"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="min-w-0 flex-1 rounded-md border border-stroke px-3 py-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary md:py-2 md:text-sm"
              />
              <Button type="submit" variante="primaria" disabled={buscandoProduto} className="shrink-0">
                {buscandoProduto ? 'Buscando…' : 'Buscar'}
              </Button>
            </form>
          )}
        </>
      )}
      {erro && <div className="mt-2 text-sm text-danger">{erro}</div>}
    </div>
  );
}
