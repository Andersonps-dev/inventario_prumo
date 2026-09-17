import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAdicionarItemEvento } from '../../api/hooks';
import { ApiError } from '../../api/client';

export function AdicionarItemGremioModal({
  eventoId,
  enderecoId,
  enderecoCodigo,
  produto,
  onClose,
}: {
  eventoId: number;
  enderecoId: number;
  enderecoCodigo: string;
  produto: { produtoId: number; sku: string; nome: string; disponivel: number };
  onClose: () => void;
}) {
  const adicionar = useAdicionarItemEvento();
  const [quantidade, setQuantidade] = useState('1');
  const [erro, setErro] = useState<string | null>(null);

  const quantidadeNum = Number(quantidade.replace(',', '.'));
  const valido = quantidade.trim() !== '' && quantidadeNum > 0 && quantidadeNum <= produto.disponivel;

  const confirmar = async () => {
    setErro(null);
    if (!valido) return;
    try {
      await adicionar.mutateAsync({ id: eventoId, produtoId: produto.produtoId, enderecoId, quantidade: quantidadeNum });
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível adicionar o item.');
    }
  };

  return (
    <Modal title="Adicionar ao grêmio" onClose={onClose} largura="max-w-sm">
      <div className="flex flex-col gap-3">
        <div className="rounded-md border border-stroke/30 bg-surface px-3 py-2 text-sm">
          <div className="font-mono text-xs text-muted">{produto.sku}</div>
          <div className="text-ink">{produto.nome}</div>
          <div className="mt-1 text-xs text-muted">
            Posição <span className="font-mono text-ink">{enderecoCodigo}</span> · disponível{' '}
            <span className="font-semibold text-ink">{produto.disponivel}</span>
          </div>
        </div>

        <Field label="Quantidade">
          <input
            autoFocus
            type="number"
            step="any"
            min={0}
            max={produto.disponivel}
            className="rounded-md border border-stroke/50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirmar();
              }
            }}
          />
        </Field>
        {quantidade.trim() !== '' && !valido && (
          <div className="-mt-2 text-xs text-danger">Informe um valor entre 0 e {produto.disponivel}.</div>
        )}

        {erro && <div className="text-sm text-danger">{erro}</div>}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variante="primaria" disabled={!valido || adicionar.isPending} onClick={confirmar}>
            {adicionar.isPending ? 'Adicionando…' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
