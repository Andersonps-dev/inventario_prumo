import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({
  titulo,
  descricao,
  rotuloConfirmar = 'Confirmar',
  rotuloCancelar = 'Cancelar',
  variante = 'perigo',
  pendente = false,
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  descricao: string;
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  variante?: 'perigo' | 'primaria';
  pendente?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Modal title={titulo} onClose={onCancelar} largura="max-w-sm">
      <div className="flex gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
            variante === 'perigo' ? 'bg-divergente/10 text-divergente' : 'bg-latao/15 text-latao-escuro'
          }`}
          aria-hidden
        >
          {variante === 'perigo' ? '⚠' : '◆'}
        </div>
        <p className="pt-2 text-sm leading-relaxed text-aco/75">{descricao}</p>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onCancelar} disabled={pendente}>
          {rotuloCancelar}
        </Button>
        <Button variante={variante} onClick={onConfirmar} carregando={pendente}>
          {rotuloConfirmar}
        </Button>
      </div>
    </Modal>
  );
}
