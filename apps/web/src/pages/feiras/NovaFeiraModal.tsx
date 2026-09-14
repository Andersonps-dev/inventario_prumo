import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { Field, Input, Select } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCriarEventoVenda, useDepositos, usePosicaoEstoque } from '../../api/hooks';
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

export function NovaFeiraModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const criar = useCriarEventoVenda();
  const { data: depositos } = useDepositos({ ativo: true });
  const [titulo, setTitulo] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [depositoOrigemId, setDepositoOrigemId] = useState<number | ''>('');
  const { data: posicao } = usePosicaoEstoque(depositoOrigemId || undefined);
  const [itemEscolhidoId, setItemEscolhidoId] = useState('');
  const [quantidadeEscolhida, setQuantidadeEscolhida] = useState('');
  const [carrinho, setCarrinho] = useState<LinhaCarrinho[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Uma opção por (produto, endereço) — o estoque é controlado por
  // posição física, então o usuário escolhe exatamente de qual prateleira
  // está tirando, não só "quanto tem desse produto no depósito todo".
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

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!titulo.trim() || !depositoOrigemId || carrinho.length === 0) return;
    try {
      const evento = await criar.mutateAsync({
        titulo: titulo.trim(),
        dataEvento: dataEvento || undefined,
        depositoOrigemId,
        itens: carrinho.map((c) => ({ produtoId: c.produtoId, enderecoId: c.enderecoId, quantidade: Number(c.quantidade) })),
      });
      onClose();
      navigate(`/feiras/${evento.id}`);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar a feira.');
    }
  };

  return (
    <Modal title="Nova feira" onClose={onClose} largura="max-w-2xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Título">
          <Input required placeholder="Feira de Setembro, Bazar da praça…" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Field>

        <Field label="Data da feira (opcional)">
          <Input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} className="w-full sm:w-48" />
        </Field>

        <Field label="Depósito de origem">
          <Select
            required
            value={depositoOrigemId}
            onChange={(e) => {
              setDepositoOrigemId(e.target.value ? Number(e.target.value) : '');
              setCarrinho([]);
            }}
          >
            <option value="">Selecione…</option>
            {depositos?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </Select>
        </Field>

        {depositoOrigemId && (
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
              <div className="mt-1 text-xs text-divergente">Quantidade precisa ser maior que zero e não pode passar do disponível nessa posição.</div>
            )}
          </Field>
        )}

        {carrinho.length > 0 && (
          <div className="rounded-md border border-nevoa/30">
            {carrinho.map((c) => (
              <div
                key={`${c.produtoId}-${c.enderecoId}`}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-nevoa/10 px-3 py-2 text-sm last:border-0"
              >
                <span className="font-mono text-xs text-nevoa">{c.sku}</span>
                <span className="min-w-0 flex-1 truncate text-aco">{c.nome}</span>
                <span className="font-mono text-xs text-latao-escuro">{c.posicao}</span>
                <span className="font-semibold text-aco">{c.quantidade}</span>
                <button
                  type="button"
                  className="shrink-0 text-divergente hover:underline"
                  onClick={() => removerDoCarrinho(c.produtoId, c.enderecoId)}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        {erro && <div className="text-sm text-divergente">{erro}</div>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variante="primaria" disabled={criar.isPending || carrinho.length === 0}>
            {criar.isPending ? 'Criando…' : 'Criar feira'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
