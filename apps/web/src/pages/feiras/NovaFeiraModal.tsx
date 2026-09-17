import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { Field, Input, Select } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCriarEventoVenda, useDepositos } from '../../api/hooks';
import { ApiError } from '../../api/client';
import { SeletorPosicoes } from './SeletorPosicoes';

export function NovaFeiraModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const criar = useCriarEventoVenda();
  const { data: depositos } = useDepositos({ ativo: true });
  const [titulo, setTitulo] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [depositoOrigemId, setDepositoOrigemId] = useState<number | ''>('');
  const [enderecoIds, setEnderecoIds] = useState<Set<number>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!titulo.trim() || !depositoOrigemId || enderecoIds.size === 0) return;
    try {
      const evento = await criar.mutateAsync({
        titulo: titulo.trim(),
        dataEvento: dataEvento || undefined,
        depositoOrigemId,
        enderecoIds: [...enderecoIds],
      });
      onClose();
      navigate(`/feiras/${evento.id}`);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar o grêmio.');
    }
  };

  return (
    <Modal title="Novo grêmio" onClose={onClose} largura="max-w-2xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="sm:flex-1">
            <Field label="Título">
              <Input required placeholder="Grêmio de Setembro, Bazar da praça…" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </Field>
          </div>
          <div className="sm:w-48 sm:shrink-0">
            <Field label="Data (opcional)">
              <Input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} className="w-full" />
            </Field>
          </div>
        </div>

        <Field label="Depósito">
          <Select
            required
            value={depositoOrigemId}
            onChange={(e) => {
              setDepositoOrigemId(e.target.value ? Number(e.target.value) : '');
              setEnderecoIds(new Set());
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

        <Field label={`Posições habilitadas${enderecoIds.size > 0 ? ` (${enderecoIds.size} selecionada(s))` : ''}`}>
          <SeletorPosicoes depositoId={depositoOrigemId} selecionados={enderecoIds} onChange={setEnderecoIds} />
        </Field>
        <p className="-mt-2 text-xs text-muted">
          Depois de criado, você poderá bipar produto pra adicionar ao grêmio em qualquer uma dessas posições — e ainda dá pra
          incluir mais posições com o grêmio já aberto.
        </p>

        {erro && <div className="text-sm text-danger">{erro}</div>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variante="primaria" disabled={criar.isPending || enderecoIds.size === 0}>
            {criar.isPending ? 'Criando…' : 'Criar grêmio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
