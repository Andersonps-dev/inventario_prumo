import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primaria' | 'secundaria' | 'perigo' | 'fantasma';

const CLASSES: Record<Variante, string> = {
  // O estado :disabled de cada variante desliga cor de fundo/texto na mão
  // (em vez de opacity-50 no botão inteiro) — opacity no elemento inteiro
  // faz fundo E texto convergirem juntos pra cor da página por trás,
  // deixando o texto quase ilegível. Aqui só o fundo esmaece de verdade.
  primaria:
    'bg-latao text-aco font-semibold shadow-[0_1px_2px_-1px_rgba(18,40,63,0.25),0_2px_4px_rgba(18,40,63,0.12)] hover:bg-latao-escuro hover:shadow-[0_2px_4px_-1px_rgba(18,40,63,0.3),0_4px_8px_rgba(18,40,63,0.14)] active:shadow-none disabled:bg-latao/40 disabled:text-aco/70',
  secundaria:
    'bg-white text-aco border border-aco/12 shadow-[0_1px_2px_rgba(18,40,63,0.04)] hover:bg-concreto hover:border-aco/18 active:shadow-none disabled:text-aco/40 disabled:border-aco/8',
  perigo:
    'bg-divergente text-white font-semibold shadow-[0_1px_2px_-1px_rgba(179,64,47,0.35),0_2px_4px_rgba(179,64,47,0.16)] hover:bg-divergente/90 hover:shadow-[0_2px_4px_-1px_rgba(179,64,47,0.4),0_4px_8px_rgba(179,64,47,0.18)] active:shadow-none disabled:bg-divergente/40 disabled:text-white/90',
  fantasma: 'bg-transparent text-aco hover:bg-aco/6 active:bg-aco/10 disabled:text-aco/40',
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
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-[background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(224,169,74,0.45)] ${CLASSES[variante]} ${className}`}
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
