import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { Field, Input, Select } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCriarEntrada, useDepositos } from '../../api/hooks';
import { ApiError } from '../../api/client';

export function NovaEntradaModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const criar = useCriarEntrada();
  const { data: depositos } = useDepositos({ ativo: true });
  const [nota, setNota] = useState('');
  const [depositoId, setDepositoId] = useState<number | ''>('');
  const [erro, setErro] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!nota.trim() || !depositoId) return;
    try {
      const entrada = await criar.mutateAsync({ nota: nota.trim(), depositoId });
      onClose();
      navigate(`/entradas/${entrada.id}`);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar a entrada.');
    }
  };

  return (
    <Modal title="Nova entrada por nota fiscal" onClose={onClose} largura="max-w-lg">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Nota fiscal">
          <Input required placeholder="Número ou identificação da NF" value={nota} onChange={(e) => setNota(e.target.value)} />
        </Field>
        <Field label="Depósito de destino">
          <Select required value={depositoId} onChange={(e) => setDepositoId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Selecione…</option>
            {depositos?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </Select>
        </Field>
        <p className="-mt-2 text-xs text-muted">
          Depois de criada, você vai bipar os produtos recebidos. Ao finalizar, entra numa etapa de distribuição pra
          colocar cada quantidade numa posição do depósito.
        </p>

        {erro && <div className="text-sm text-danger">{erro}</div>}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variante="primaria" disabled={criar.isPending || !nota.trim() || !depositoId}>
            {criar.isPending ? 'Criando…' : 'Criar entrada'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
