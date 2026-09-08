import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export function PromptDialog({
  titulo,
  rotuloCampo = 'Motivo',
  placeholder,
  minLength = 3,
  rotuloConfirmar = 'Confirmar',
  variante = 'perigo',
  pendente = false,
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  rotuloCampo?: string;
  placeholder?: string;
  minLength?: number;
  rotuloConfirmar?: string;
  variante?: 'perigo' | 'primaria';
  pendente?: boolean;
  onConfirmar: (valor: string) => void;
  onCancelar: () => void;
}) {
  const [valor, setValor] = useState('');
  const valido = valor.trim().length >= minLength;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (valido) onConfirmar(valor.trim());
  };

  return (
    <Modal title={titulo} onClose={onCancelar} largura="max-w-sm">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm text-aco">
          <span className="font-medium">{rotuloCampo}</span>
          <textarea
            autoFocus
            required
            minLength={minLength}
            rows={3}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={placeholder}
            className="resize-none rounded-md border border-aco/12 bg-concreto/50 px-3 py-2 text-sm text-aco outline-none transition-shadow focus:border-latao focus:bg-white focus:shadow-[0_0_0_3px_rgba(224,169,74,0.25)]"
          />
        </label>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" onClick={onCancelar} disabled={pendente}>
            Cancelar
          </Button>
          <Button type="submit" variante={variante} disabled={!valido} carregando={pendente}>
            {rotuloConfirmar}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
