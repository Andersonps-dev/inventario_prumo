import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field, Input, Select } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAtualizarUsuarioAdmin, useCriarUsuarioAdmin } from '../../api/hooks';
import { ApiError } from '../../api/client';
import type { UsuarioAdmin } from '../../api/types';

type PapelEditavel = 'CONTADOR' | 'SUPERVISOR' | 'ADMIN';

const PAPEIS: { valor: PapelEditavel; rotulo: string }[] = [
  { valor: 'CONTADOR', rotulo: 'Contador' },
  { valor: 'SUPERVISOR', rotulo: 'Supervisor' },
  { valor: 'ADMIN', rotulo: 'Admin' },
];

export function UsuarioFormModal({ usuario, onClose }: { usuario: UsuarioAdmin | null; onClose: () => void }) {
  const criar = useCriarUsuarioAdmin();
  const atualizar = useAtualizarUsuarioAdmin();
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: usuario?.nome ?? '',
    email: usuario?.email ?? '',
    senha: '',
    papel: ((usuario?.papel === 'SUPER_ADMIN' ? 'ADMIN' : usuario?.papel) ?? 'CONTADOR') as PapelEditavel,
    ativo: usuario?.ativo ?? true,
  });

  const salvando = criar.isPending || atualizar.isPending;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    try {
      if (usuario) {
        await atualizar.mutateAsync({ id: usuario.id, dto: { nome: form.nome, papel: form.papel, ativo: form.ativo } });
      } else {
        await criar.mutateAsync({ nome: form.nome, email: form.email, senha: form.senha, papel: form.papel });
      }
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar o usuário.');
    }
  };

  return (
    <Modal title={usuario ? `Editar ${usuario.nome}` : 'Novo usuário'} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Nome">
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </Field>

        <Field label="Email">
          <Input
            type="email"
            required
            disabled={!!usuario}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>

        {!usuario && (
          <Field label="Senha">
            <Input
              type="password"
              required
              minLength={6}
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
            />
          </Field>
        )}

        <Field label="Papel">
          <Select value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value as PapelEditavel })}>
            {PAPEIS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </Select>
        </Field>

        {usuario && (
          <label className="flex items-center gap-2 text-sm text-aco">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
            Usuário ativo
            {!form.ativo && <span className="text-xs text-nevoa">— inativo não consegue mais entrar no sistema</span>}
          </label>
        )}

        {erro && <div className="text-sm text-divergente">{erro}</div>}

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
