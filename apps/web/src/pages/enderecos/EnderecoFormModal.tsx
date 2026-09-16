import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field, Input, Select } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAtualizarEndereco, useCriarEndereco, useDepositos } from '../../api/hooks';
import { ApiError } from '../../api/client';
import type { Endereco } from '../../api/types';

export function EnderecoFormModal({ endereco, depositoId, onClose }: {
  endereco: Endereco | null;
  depositoId?: number;
  onClose: () => void;
}) {
  // Sem filtro aqui: em edição o campo fica travado (abaixo) mas precisa
  // continuar mostrando o depósito atual mesmo que ele tenha sido
  // inativado depois que o endereço foi criado — só a criação de endereço
  // novo restringe às opções ativas.
  const { data: depositos } = useDepositos();
  const depositosParaEscolher = endereco ? depositos : depositos?.filter((d) => d.ativo);
  const criar = useCriarEndereco();
  const atualizar = useAtualizarEndereco();
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    depositoId: endereco?.depositoId ?? depositoId ?? depositosParaEscolher?.[0]?.id ?? 0,
    setor: endereco?.setor ?? '',
    rua: endereco?.rua ?? '',
    modulo: endereco?.modulo ?? '',
    nivel: endereco?.nivel ?? '',
    vao: endereco?.vao ?? '',
  });

  const salvando = criar.isPending || atualizar.isPending;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    try {
      if (endereco) {
        await atualizar.mutateAsync({ id: endereco.id, dto: form });
      } else {
        await criar.mutateAsync(form);
      }
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar o endereço.');
    }
  };

  return (
    <Modal title={endereco ? `Editar ${endereco.codigo}` : 'Novo endereço'} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Depósito">
          <Select
            required
            disabled={!!endereco}
            value={form.depositoId}
            onChange={(e) => setForm({ ...form, depositoId: Number(e.target.value) })}
          >
            {depositosParaEscolher?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Setor">
            <Input required value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} />
          </Field>
          <Field label="Rua">
            <Input required value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} />
          </Field>
          <Field label="Módulo">
            <Input required value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nível">
            <Input required value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} />
          </Field>
          <Field label="Vão">
            <Input required value={form.vao} onChange={(e) => setForm({ ...form, vao: e.target.value })} />
          </Field>
        </div>

        {erro && <div className="text-sm text-danger">{erro}</div>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variante="primaria" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
