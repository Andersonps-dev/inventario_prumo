import { useEffect, type ReactNode } from 'react';

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
      className="animate-prumo-backdrop fixed inset-0 z-50 flex items-center justify-center bg-aco/45 p-4 backdrop-blur-[2px]"
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
        className={`animate-prumo-panel w-full ${largura} max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl bg-white p-6 shadow-[0_0_0_1px_rgba(18,40,63,0.06),0_12px_24px_-8px_rgba(18,40,63,0.18),0_24px_48px_-16px_rgba(18,40,63,0.22)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="modal-titulo" className="text-lg font-semibold tracking-tight text-aco">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="-mr-1.5 -mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-nevoa transition-colors hover:bg-aco/6 hover:text-aco focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(224,169,74,0.45)]"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
