import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 text-sm">{children}</div>;
}

const CORES: Record<string, string> = {
  normal: 'text-latao-escuro',
  perigo: 'text-divergente',
  neutro: 'text-nevoa',
};

export function RowAction({
  tom = 'normal',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tom?: 'normal' | 'perigo' | 'neutro' }) {
  return (
    <button
      // Padding + margem negativa cancelando-se: a área clicável cresce
      // (usa o espaço do gap entre os botões) sem empurrar o layout — texto
      // fica no mesmo lugar, mas o alvo de toque deixa de ficar abaixo do
      // mínimo recomendado pra mobile.
      className={`-mx-1 -my-1.5 px-1 py-1.5 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline ${CORES[tom]} ${className}`}
      {...props}
    />
  );
}
