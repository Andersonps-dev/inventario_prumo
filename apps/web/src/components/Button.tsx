import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primaria' | 'secundaria' | 'perigo' | 'fantasma';

const CLASSES: Record<Variante, string> = {
  // O estado :disabled de cada variante desliga cor de fundo/texto na mão
  // (em vez de opacity-50 no botão inteiro) — opacity no elemento inteiro
  // faz fundo E texto convergirem juntos pra cor da página por trás,
  // deixando o texto quase ilegível. Aqui só o fundo esmaece de verdade.
  primaria:
    'bg-primary text-white font-semibold shadow-sm shadow-primary/20 hover:bg-primary-hover hover:shadow-md hover:shadow-primary/25 disabled:bg-primary/40 disabled:shadow-none',
  secundaria:
    'bg-card text-ink border border-stroke shadow-sm hover:border-primary/40 hover:bg-surface disabled:text-muted disabled:border-stroke/60 disabled:shadow-none',
  perigo:
    'bg-danger text-white font-semibold shadow-sm shadow-danger/20 hover:bg-danger/90 hover:shadow-md hover:shadow-danger/25 disabled:bg-danger/40 disabled:shadow-none',
  fantasma: 'bg-transparent text-ink hover:bg-ink/5 active:bg-ink/10 disabled:text-muted',
};

export function Button({
  variante = 'secundaria',
  carregando = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; carregando?: boolean }) {
  return (
    <button
      disabled={disabled || carregando}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-all duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 ${CLASSES[variante]} ${className}`}
      {...props}
    >
      {carregando && (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Z" />
        </svg>
      )}
      {children}
    </button>
  );
}
