import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';

/**
 * Menu "⋮" por linha, não mais links inline sublinhados — numa tabela densa
 * (várias linhas, 2-3 ações cada) o link inline competia visualmente com o
 * dado da linha. Renderizado via portal em document.body: o wrapper da
 * Table tem overflow-x-auto, e por regra do CSS isso faz overflow-y
 * computar como "auto" também — um menu posicionado normal (absolute)
 * ficava cortado nas últimas linhas da tabela. Fecha ao clicar fora, ao
 * escolher uma ação, ou ao rolar a página (mais simples que reposicionar).
 */
export function RowActions({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState<{ top: number; right: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fechar = () => setAberto(false);
    const aoClicarFora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (botaoRef.current?.contains(alvo) || menuRef.current?.contains(alvo)) return;
      setAberto(false);
    };
    document.addEventListener('mousedown', aoClicarFora);
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [aberto]);

  const alternar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = botaoRef.current?.getBoundingClientRect();
    if (rect) setPosicao({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setAberto((v) => !v);
  };

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={alternar}
        aria-label="Mais ações"
        aria-expanded={aberto}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <MoreVertical size={16} />
      </button>
      {aberto &&
        posicao &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            onClick={(e) => {
              e.stopPropagation();
              setAberto(false);
            }}
            style={{ position: 'fixed', top: posicao.top, right: posicao.right }}
            className="z-50 min-w-36 overflow-hidden rounded-card border border-stroke bg-card py-1 text-sm shadow-lg"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

const CORES: Record<string, string> = {
  normal: 'text-ink hover:bg-surface',
  perigo: 'text-danger hover:bg-danger/10',
  neutro: 'text-muted hover:bg-surface',
};

export function RowAction({
  tom = 'normal',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tom?: 'normal' | 'perigo' | 'neutro' }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`block w-full px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${CORES[tom]} ${className}`}
      {...props}
    />
  );
}
