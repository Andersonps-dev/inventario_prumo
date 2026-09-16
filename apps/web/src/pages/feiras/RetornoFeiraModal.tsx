import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field, Input, Select } from '../../components/Input';
import { Button } from '../../components/Button';
import { useEnderecos, useRegistrarRetornoEvento } from '../../api/hooks';
import { ApiError } from '../../api/client';
import type { PosicaoEstoqueLinha } from '../../api/types';

interface LinhaCarrinho {
  produtoId: number;
  enderecoId: number;
  sku: string;
  nome: string;
  posicao: string;
  disponivel: number;
  quantidade: string;
}

export function RetornoFeiraModal({
  eventoId,
  depositoOrigemId,
  itensNaFeira,
  onClose,
}: {
  eventoId: number;
  depositoOrigemId: number;
  itensNaFeira: PosicaoEstoqueLinha[];
  onClose: () => void;
}) {
  const registrar = useRegistrarRetornoEvento();
  const { data: enderecos } = useEnderecos({ depositoId: depositoOrigemId, ativo: true });
  const [produtoEscolhidoId, setProdutoEscolhidoId] = useState<number | ''>('');
  const [enderecoEscolhidoId, setEnderecoEscolhidoId] = useState<number | ''>('');
  const [quantidadeEscolhida, setQuantidadeEscolhida] = useState('');
  const [carrinho, setCarrinho] = useState<LinhaCarrinho[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const disponiveis = itensNaFeira
    .map((p) => ({ produtoId: p.produto_id, sku: p.sku, nome: p.nome, disponivel: p.saldo }))
    .filter((p) => p.disponivel > 0);

  const produtoSelecionado = disponiveis.find((p) => p.produtoId === produtoEscolhidoId);
  const enderecoSelecionado = enderecos?.find((e) => e.id === enderecoEscolhidoId);
  const quantidadeInvalida =
    !!produtoSelecionado &&
    quantidadeEscolhida !== '' &&
    (Number(quantidadeEscolhida) <= 0 || Number(quantidadeEscolhida) > produtoSelecionado.disponivel);

  const adicionarAoCarrinho = () => {
    if (!produtoSelecionado || !enderecoSelecionado || !quantidadeEscolhida || quantidadeInvalida) return;
    setCarrinho((atual) => [
      ...atual,
      {
        produtoId: produtoSelecionado.produtoId,
        enderecoId: enderecoSelecionado.id,
        sku: produtoSelecionado.sku,
        nome: produtoSelecionado.nome,
        posicao: enderecoSelecionado.codigo,
        disponivel: produtoSelecionado.disponivel,
        quantidade: quantidadeEscolhida,
      },
    ]);
    setProdutoEscolhidoId('');
    setEnderecoEscolhidoId('');
    setQuantidadeEscolhida('');
  };

  const removerDoCarrinho = (produtoId: number, enderecoId: number) => {
    setCarrinho((atual) => atual.filter((c) => !(c.produtoId === produtoId && c.enderecoId === enderecoId)));
  };

  const confirmar = async () => {
    setErro(null);
    try {
      await registrar.mutateAsync({
        id: eventoId,
        itens: carrinho.map((c) => ({ produtoId: c.produtoId, enderecoId: c.enderecoId, quantidade: Number(c.quantidade) })),
      });
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível registrar o retorno.');
    }
  };

  return (
    <Modal title="Registrar retorno da feira" onClose={onClose} largura="max-w-2xl">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted">
          Informe só o que não foi vendido e voltou fisicamente, e em qual posição do depósito de origem ele volta a
          ficar. Se vendeu tudo, feche a janela e use "Fechar feira e gerar relatório" direto, sem passar por aqui.
        </p>

        <Field label="Produto">
          <Select value={produtoEscolhidoId} onChange={(e) => setProdutoEscolhidoId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Selecione um produto…</option>
            {disponiveis.map((p) => (
              <option key={p.produtoId} value={p.produtoId}>
                {p.sku} — {p.nome} (na feira: {p.disponivel})
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="sm:flex-1">
            <Field label="Posição de destino">
              <Select value={enderecoEscolhidoId} onChange={(e) => setEnderecoEscolhidoId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Selecione a posição…</option>
                {enderecos?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.codigo}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 sm:w-24 sm:flex-none">
              <Field label="Qtd.">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={quantidadeEscolhida}
                  onChange={(e) => setQuantidadeEscolhida(e.target.value)}
                  className="w-full"
                />
              </Field>
            </div>
            <Button
              type="button"
              className="shrink-0 self-end"
              onClick={adicionarAoCarrinho}
              disabled={!produtoSelecionado || !enderecoSelecionado || !quantidadeEscolhida || quantidadeInvalida}
            >
              + Adicionar
            </Button>
          </div>
        </div>
        {quantidadeInvalida && (
          <div className="-mt-2 text-xs text-danger">Quantidade precisa ser maior que zero e não pode passar do que ainda está na feira.</div>
        )}

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
          <Button type="button" variante="primaria" disabled={registrar.isPending || carrinho.length === 0} onClick={confirmar}>
            {registrar.isPending ? 'Registrando…' : 'Registrar retorno'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
