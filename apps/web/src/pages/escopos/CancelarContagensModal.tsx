import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCancelarContagensEmLote } from '../../api/hooks';
import { ApiError } from '../../api/client';
import type { EscopoItem } from '../../api/types';

export function CancelarContagensModal({
  escopoId,
  itensContados,
  onClose,
}: {
  escopoId: number;
  itensContados: EscopoItem[];
  onClose: () => void;
}) {
  const cancelar = useCancelarContagensEmLote();
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const todosSelecionados = itensContados.length > 0 && selecionados.size === itensContados.length;

  const alternarTodos = () => {
    setSelecionados(todosSelecionados ? new Set() : new Set(itensContados.map((i) => i.id)));
  };

  const alternar = (id: number) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const confirmar = async () => {
    setErro(null);
    const contagemIds = itensContados
      .filter((i) => selecionados.has(i.id))
      .map((i) => i.contagens.find((c) => c.status === 'VALIDA')?.id)
      .filter((id): id is number => id !== undefined);
    if (contagemIds.length === 0) return;
    try {
      await cancelar.mutateAsync({ escopoId, contagemIds, motivo: motivo.trim() });
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível cancelar as contagens selecionadas.');
    }
  };

  return (
    <Modal title="Cancelar contagens" onClose={onClose} largura="max-w-2xl">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted">
          Selecione quais contagens cancelar — cada item volta pra contagem anterior (se houver) ou pra pendente.
        </p>

        <div className="rounded-md border border-stroke/30">
          <label className="flex items-center gap-2 border-b border-stroke/20 bg-surface px-3 py-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={todosSelecionados} onChange={alternarTodos} />
            Selecionar todas ({itensContados.length})
          </label>
          <div className="max-h-72 overflow-y-auto">
            {itensContados.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 border-b border-stroke/10 px-3 py-2 text-sm last:border-0 hover:bg-surface"
              >
                <input type="checkbox" checked={selecionados.has(item.id)} onChange={() => alternar(item.id)} />
                <span className="font-mono text-xs text-muted">{item.produto.sku}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{item.produto.nome}</span>
                {!item.endereco.interno && <span className="font-mono text-xs text-warning">{item.endereco.codigo}</span>}
                <span className="font-semibold text-ink">{item.quantidadeFinal}</span>
              </label>
            ))}
            {itensContados.length === 0 && (
              <div className="px-3 py-3 text-sm text-muted">Nenhum item contado neste escopo.</div>
            )}
          </div>
        </div>

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
            Cancelar
          </Button>
          <Button
            type="button"
            variante="perigo"
            disabled={selecionados.size === 0 || motivo.trim().length < 3 || cancelar.isPending}
            onClick={confirmar}
          >
            {cancelar.isPending ? 'Cancelando…' : `Cancelar contagem(ns)${selecionados.size > 0 ? ` (${selecionados.size})` : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
