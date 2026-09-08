import type { ReactNode, TdHTMLAttributes } from 'react';

export function Table({ children }: { children: ReactNode }) {
  return (
    // Sombras nas bordas indicam que há mais colunas fora da tela — somem
    // sozinhas quando não há mais o que rolar pro lado (truque de CSS puro
    // com 4 gradientes: os 2 primeiros "cortam" as sombras nas pontas reais
    // do conteúdo scrollável, background-attachment:local os move com o
    // scroll; os 2 últimos ficam fixos e criam a sombra visível).
    <div
      className="overflow-x-auto rounded-lg border border-nevoa/30 bg-white"
      style={{
        backgroundImage:
          'linear-gradient(to right, white, rgba(255,255,255,0)), linear-gradient(to left, white, rgba(255,255,255,0)), linear-gradient(to right, rgba(19,42,64,0.12), rgba(19,42,64,0)), linear-gradient(to left, rgba(19,42,64,0.12), rgba(19,42,64,0))',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '24px 100%, 24px 100%, 10px 100%, 10px 100%',
        backgroundPosition: 'left center, right center, left center, right center',
        backgroundAttachment: 'local, local, scroll, scroll',
      }}
    >
      <table className="w-full min-w-max border-collapse text-sm">{children}</table>
    </div>
  );
}

interface Ordenacao {
  campo: string | null;
  direcao: 'asc' | 'desc';
}

export function Th({
  children,
  sortKey,
  ordenacao,
  onSort,
}: {
  children?: ReactNode;
  /** Quando informado junto de `ordenacao`/`onSort`, o cabeçalho vira clicável — ver useOrdenacao. */
  sortKey?: string;
  ordenacao?: Ordenacao;
  onSort?: (campo: string) => void;
}) {
  if (!sortKey || !onSort) {
    return <th className="border-b border-nevoa/30 bg-concreto px-4 py-2.5 text-left font-semibold text-aco">{children}</th>;
  }
  const ativo = ordenacao?.campo === sortKey;
  return (
    <th className="border-b border-nevoa/30 bg-concreto px-4 py-2.5 text-left font-semibold text-aco">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 hover:text-latao-escuro ${ativo ? 'text-latao-escuro' : ''}`}
      >
        {children}
        <span className="text-[10px]">{ativo ? (ordenacao?.direcao === 'asc' ? '▲' : '▼') : '⇅'}</span>
      </button>
    </th>
  );
}

export function Td({ children, className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`border-b border-nevoa/15 px-4 py-2.5 text-aco ${className}`} {...props}>
      {children}
    </td>
  );
}
