import { useMemo, useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field, Input, Select } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAdicionarItensEvento, usePosicaoEstoque } from '../../api/hooks';
import { ApiError } from '../../api/client';

interface LinhaCarrinho {
  produtoId: number;
  enderecoId: number;
  sku: string;
  nome: string;
  posicao: string;
  disponivel: number;
  quantidade: string;
}

export function AdicionarItensFeiraModal({
  eventoId,
  depositoOrigemId,
  onClose,
}: {
  eventoId: number;
  depositoOrigemId: number;
  onClose: () => void;
}) {
  const adicionar = useAdicionarItensEvento();
  const { data: posicao } = usePosicaoEstoque(depositoOrigemId);
  const [itemEscolhidoId, setItemEscolhidoId] = useState('');
  const [quantidadeEscolhida, setQuantidadeEscolhida] = useState('');
  const [carrinho, setCarrinho] = useState<LinhaCarrinho[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const posicoesDisponiveis = useMemo(() => {
    return (posicao ?? [])
      .filter((p) => p.saldo > 0 && !carrinho.some((c) => c.produtoId === p.produto_id && c.enderecoId === p.endereco_id))
      .map((p) => ({
        chave: `${p.produto_id}-${p.endereco_id}`,
        produtoId: p.produto_id,
        enderecoId: p.endereco_id,
        sku: p.sku,
        nome: p.nome,
        posicao: p.endereco_interno ? 'sem endereço' : p.posicao,
        disponivel: p.saldo,
      }));
  }, [posicao, carrinho]);

  const itemSelecionado = posicoesDisponiveis.find((p) => p.chave === itemEscolhidoId);
  const quantidadeInvalida =
    !!itemSelecionado &&
    quantidadeEscolhida !== '' &&
    (Number(quantidadeEscolhida) <= 0 || Number(quantidadeEscolhida) > itemSelecionado.disponivel);

  const adicionarAoCarrinho = () => {
    if (!itemSelecionado || !quantidadeEscolhida || quantidadeInvalida) return;
    setCarrinho((atual) => [...atual, { ...itemSelecionado, quantidade: quantidadeEscolhida }]);
    setItemEscolhidoId('');
    setQuantidadeEscolhida('');
  };

  const removerDoCarrinho = (produtoId: number, enderecoId: number) => {
    setCarrinho((atual) => atual.filter((c) => !(c.produtoId === produtoId && c.enderecoId === enderecoId)));
  };

  const confirmar = async () => {
    setErro(null);
    try {
      await adicionar.mutateAsync({
        id: eventoId,
        itens: carrinho.map((c) => ({ produtoId: c.produtoId, enderecoId: c.enderecoId, quantidade: Number(c.quantidade) })),
      });
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível adicionar os itens.');
    }
  };

  return (
    <Modal title="Adicionar itens à feira" onClose={onClose} largura="max-w-2xl">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted">Escolha mais produtos do depósito de origem pra levar — o saldo sai de lá e entra na feira.</p>

        <Field label="Itens a levar (produto — posição)">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={itemEscolhidoId} onChange={(e) => setItemEscolhidoId(e.target.value)} className="sm:flex-1">
              <option value="">Selecione produto e posição…</option>
              {posicoesDisponiveis.map((p) => (
                <option key={p.chave} value={p.chave}>
                  {p.sku} — {p.nome} — {p.posicao} (disp. {p.disponivel})
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Qtd."
                value={quantidadeEscolhida}
                onChange={(e) => setQuantidadeEscolhida(e.target.value)}
                className="w-full sm:w-24"
              />
              <Button
                type="button"
                className="shrink-0"
                onClick={adicionarAoCarrinho}
                disabled={!itemSelecionado || !quantidadeEscolhida || quantidadeInvalida}
              >
                + Adicionar
              </Button>
            </div>
          </div>
          {quantidadeInvalida && (
            <div className="mt-1 text-xs text-danger">Quantidade precisa ser maior que zero e não pode passar do disponível nessa posição.</div>
          )}
        </Field>

        {carrinho.length > 0 && (
          <div className="rounded-md border border-stroke/30">
            {carrinho.map((c) => (
              <div
                key={`${c.produtoId}-${c.enderecoId}`}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-stroke/10 px-3 py-2 text-sm last:border-0"
              >
                <span className="font-mono text-xs text-muted">{c.sku}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{c.nome}</span>
                <span className="font-mono text-xs text-warning">{c.posicao}</span>
                <span className="font-semibold text-ink">{c.quantidade}</span>
                <button
                  type="button"
                  className="shrink-0 text-danger hover:underline"
                  onClick={() => removerDoCarrinho(c.produtoId, c.enderecoId)}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        {erro && <div className="text-sm text-danger">{erro}</div>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variante="primaria" disabled={adicionar.isPending || carrinho.length === 0} onClick={confirmar}>
            {adicionar.isPending ? 'Adicionando…' : 'Adicionar à feira'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
