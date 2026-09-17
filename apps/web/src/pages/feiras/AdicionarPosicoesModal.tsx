import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAdicionarPosicoesEvento } from '../../api/hooks';
import { ApiError } from '../../api/client';
import { SeletorPosicoes } from './SeletorPosicoes';

export function AdicionarPosicoesModal({
  eventoId,
  depositoOrigemId,
  posicoesAtuaisIds,
  onClose,
}: {
  eventoId: number;
  depositoOrigemId: number;
  posicoesAtuaisIds: Set<number>;
  onClose: () => void;
}) {
  const adicionar = useAdicionarPosicoesEvento();
  const [enderecoIds, setEnderecoIds] = useState<Set<number>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  const confirmar = async () => {
    setErro(null);
    if (enderecoIds.size === 0) return;
    try {
      await adicionar.mutateAsync({ id: eventoId, enderecoIds: [...enderecoIds] });
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível adicionar as posições.');
    }
  };

  return (
    <Modal title="Adicionar posições ao grêmio" onClose={onClose} largura="max-w-2xl">
      <div className="flex flex-col gap-4">
        <Field label={`Novas posições${enderecoIds.size > 0 ? ` (${enderecoIds.size} selecionada(s))` : ''}`}>
          <SeletorPosicoes
            depositoId={depositoOrigemId}
            selecionados={enderecoIds}
            onChange={setEnderecoIds}
            excluirIds={posicoesAtuaisIds}
          />
        </Field>

        {erro && <div className="text-sm text-danger">{erro}</div>}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variante="primaria" disabled={adicionar.isPending || enderecoIds.size === 0} onClick={confirmar}>
            {adicionar.isPending ? 'Adicionando…' : 'Adicionar posições'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
