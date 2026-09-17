import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCancelarContagem } from '../../api/hooks';
import { ApiError } from '../../api/client';
import type { EscopoItem } from '../../api/types';

export function CancelarContagemModal({
  escopoId,
  item,
  onClose,
}: {
  escopoId: number;
  item: EscopoItem;
  onClose: () => void;
}) {
  const cancelar = useCancelarContagem();
  const valida = item.contagens.find((c) => c.status === 'VALIDA');
  const totalContado = Number(valida?.quantidade ?? item.quantidadeFinal ?? 0);

  const [quantidade, setQuantidade] = useState(String(totalContado));
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const quantidadeNumero = Number(quantidade.replace(',', '.'));
  const quantidadeValida = quantidade.trim() !== '' && quantidadeNumero > 0 && quantidadeNumero <= totalContado;

  const confirmar = async () => {
    setErro(null);
    if (!valida) return;
    try {
      await cancelar.mutateAsync({ escopoId, contagemId: valida.id, quantidade: quantidadeNumero, motivo: motivo.trim() });
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível cancelar a contagem.');
    }
  };

  return (
    <Modal title="Cancelar contagem" onClose={onClose} largura="max-w-md">
      <div className="flex flex-col gap-3">
        <div className="rounded-md border border-stroke/30 bg-surface px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted">{item.produto.sku}</span>
            <span className="min-w-0 flex-1 truncate text-ink">{item.produto.nome}</span>
          </div>
          {!item.endereco.interno && <div className="mt-1 font-mono text-xs text-warning">{item.endereco.codigo}</div>}
          <div className="mt-1 text-xs text-muted">Contado: <span className="font-semibold text-ink">{totalContado}</span></div>
        </div>

        <Field label="Quantidade a cancelar">
          <input
            type="number"
            step="any"
            min={0}
            max={totalContado}
            className="rounded-md border border-stroke/50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </Field>
        {quantidade.trim() !== '' && !quantidadeValida && (
          <div className="-mt-2 text-xs text-danger">Informe um valor entre 0 e {totalContado}.</div>
        )}

        <Field label="Motivo">
          <textarea
            className="rounded-md border border-stroke/50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            rows={2}
            placeholder="Explique o motivo para o registro de auditoria…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Field>

        {erro && <div className="text-sm text-danger">{erro}</div>}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Voltar
          </Button>
          <Button
            type="button"
            variante="perigo"
            disabled={!valida || !quantidadeValida || motivo.trim().length < 3 || cancelar.isPending}
            onClick={confirmar}
          >
            {cancelar.isPending ? 'Cancelando…' : 'Cancelar contagem'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
