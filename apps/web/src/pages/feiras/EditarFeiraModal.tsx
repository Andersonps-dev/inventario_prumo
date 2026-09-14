import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field, Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAtualizarEventoVenda } from '../../api/hooks';
import { ApiError } from '../../api/client';
import type { EventoVenda } from '../../api/types';

export function EditarFeiraModal({ evento, onClose }: { evento: EventoVenda; onClose: () => void }) {
  const atualizar = useAtualizarEventoVenda();
  const [titulo, setTitulo] = useState(evento.titulo);
  const [dataEvento, setDataEvento] = useState(evento.dataEvento ? evento.dataEvento.slice(0, 10) : '');
  const [erro, setErro] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!titulo.trim()) return;
    try {
      await atualizar.mutateAsync({ id: evento.id, titulo: titulo.trim(), dataEvento: dataEvento || undefined });
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar as alterações.');
    }
  };

  return (
    <Modal title="Editar feira" onClose={onClose} largura="max-w-md">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Título">
          <Input required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Field>

        <Field label="Data da feira (opcional)">
          <Input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} className="w-full sm:w-48" />
        </Field>

        {erro && <div className="text-sm text-divergente">{erro}</div>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variante="primaria" disabled={atualizar.isPending || !titulo.trim()}>
            {atualizar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
