import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { Field, Select } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCriarTransferencia, useDepositos, useEnderecos } from '../../api/hooks';
import { ApiError } from '../../api/client';

export function NovaTransferenciaModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const criar = useCriarTransferencia();
  const { data: depositos } = useDepositos({ ativo: true });
  const [depositoId, setDepositoId] = useState<number | ''>('');
  const [enderecoOrigemId, setEnderecoOrigemId] = useState<number | ''>('');
  const [enderecoDestinoId, setEnderecoDestinoId] = useState<number | ''>('');
  const [erro, setErro] = useState<string | null>(null);

  const { data: enderecos } = useEnderecos({ depositoId: depositoId ? Number(depositoId) : undefined, ativo: true });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!depositoId || !enderecoOrigemId || !enderecoDestinoId) return;
    try {
      const transferencia = await criar.mutateAsync({ depositoId, enderecoOrigemId, enderecoDestinoId });
      onClose();
      navigate(`/transferencias/${transferencia.id}`);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar a transferência.');
    }
  };

  return (
    <Modal title="Nova transferência entre posições" onClose={onClose} largura="max-w-lg">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Depósito">
          <Select
            required
            value={depositoId}
            onChange={(e) => {
              setDepositoId(e.target.value ? Number(e.target.value) : '');
              setEnderecoOrigemId('');
              setEnderecoDestinoId('');
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

        <div className="grid grid-cols-2 gap-4">
          <Field label="Posição de origem">
            <Select required disabled={!depositoId} value={enderecoOrigemId} onChange={(e) => setEnderecoOrigemId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Selecione…</option>
              {enderecos?.filter((e) => !e.interno).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Posição de destino">
            <Select required disabled={!depositoId} value={enderecoDestinoId} onChange={(e) => setEnderecoDestinoId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Selecione…</option>
              {enderecos?.filter((e) => !e.interno && e.id !== enderecoOrigemId).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="-mt-2 text-xs text-muted">
          Depois de criada, você vai bipar os produtos que vão da origem pro destino — o saldo só muda de verdade quando
          você efetivar a transferência.
        </p>

        {erro && <div className="text-sm text-danger">{erro}</div>}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variante="primaria" disabled={criar.isPending || !depositoId || !enderecoOrigemId || !enderecoDestinoId}>
            {criar.isPending ? 'Criando…' : 'Criar transferência'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
