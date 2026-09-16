import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  title,
  onClose,
  children,
  largura = 'max-w-lg',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onClose]);

  return (
    <div
      className="animate-prumo-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        // overflow-x-hidden é proposital: overflow-y-auto sozinho faz o
        // eixo X computar como "auto" também (regra do CSS), então qualquer
        // linha interna larga demais rolava de lado em silêncio, sem barra
        // nem indicação — parecia botão sumido, não conteúdo rolável.
        className={`animate-prumo-panel w-full ${largura} max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-card bg-card p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="modal-titulo" className="text-lg font-semibold tracking-tight text-ink">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="-mr-1.5 -mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/6 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
