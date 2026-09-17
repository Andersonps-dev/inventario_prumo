import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Input';
import { Button } from '../../components/Button';
import { useRegistrarRetornoItemEvento } from '../../api/hooks';
import { ApiError } from '../../api/client';

export function DevolverItemGremioModal({
  eventoId,
  enderecoId,
  enderecoCodigo,
  item,
  onClose,
}: {
  eventoId: number;
  enderecoId: number;
  enderecoCodigo: string;
  item: { produtoId: number; sku: string; nome: string; reservado: number };
  onClose: () => void;
}) {
  const devolver = useRegistrarRetornoItemEvento();
  const [quantidade, setQuantidade] = useState(String(item.reservado));
  const [erro, setErro] = useState<string | null>(null);

  const quantidadeNum = Number(quantidade.replace(',', '.'));
  const valido = quantidade.trim() !== '' && quantidadeNum > 0 && quantidadeNum <= item.reservado;

  const confirmar = async () => {
    setErro(null);
    if (!valido) return;
    try {
      await devolver.mutateAsync({ id: eventoId, produtoId: item.produtoId, enderecoId, quantidade: quantidadeNum });
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível registrar o retorno.');
    }
  };

  return (
    <Modal title="Devolver ao estoque" onClose={onClose} largura="max-w-sm">
      <div className="flex flex-col gap-3">
        <div className="rounded-md border border-stroke/30 bg-surface px-3 py-2 text-sm">
          <div className="font-mono text-xs text-muted">{item.sku}</div>
          <div className="text-ink">{item.nome}</div>
          <div className="mt-1 text-xs text-muted">
            Posição <span className="font-mono text-ink">{enderecoCodigo}</span> · reservado{' '}
            <span className="font-semibold text-ink">{item.reservado}</span>
          </div>
        </div>

        <Field label="Quantidade a devolver">
          <input
            autoFocus
            type="number"
            step="any"
            min={0}
            max={item.reservado}
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
          <div className="-mt-2 text-xs text-danger">Informe um valor entre 0 e {item.reservado}.</div>
        )}

        {erro && <div className="text-sm text-danger">{erro}</div>}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variante="primaria" disabled={!valido || devolver.isPending} onClick={confirmar}>
            {devolver.isPending ? 'Devolvendo…' : 'Devolver'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
