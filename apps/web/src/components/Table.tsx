import type { ReactNode, TdHTMLAttributes } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

export function Table({ children }: { children: ReactNode }) {
  return (
    // Sombras nas bordas indicam que há mais colunas fora da tela — somem
    // sozinhas quando não há mais o que rolar pro lado (truque de CSS puro
    // com 4 gradientes: os 2 primeiros "cortam" as sombras nas pontas reais
    // do conteúdo scrollável, background-attachment:local os move com o
    // scroll; os 2 últimos ficam fixos e criam a sombra visível).
    <div
      className="overflow-x-auto rounded-card border border-stroke bg-card [&_tbody>tr]:transition-colors [&_tbody>tr:hover]:bg-surface"
      style={{
        backgroundImage:
          'linear-gradient(to right, var(--x-card), rgba(255,255,255,0)), linear-gradient(to left, var(--x-card), rgba(255,255,255,0)), linear-gradient(to right, rgba(15,23,42,0.12), rgba(15,23,42,0)), linear-gradient(to left, rgba(15,23,42,0.12), rgba(15,23,42,0))',
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
    return (
      <th className="border-b border-stroke bg-surface px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
        {children}
      </th>
    );
  }
  const ativo = ordenacao?.campo === sortKey;
  return (
    <th className="border-b border-stroke bg-surface px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 hover:text-primary ${ativo ? 'text-primary' : ''}`}
      >
        {children}
        {ativo ? (
          ordenacao?.direcao === 'asc' ? (
            <ChevronUp size={13} />
          ) : (
            <ChevronDown size={13} />
          )
        ) : (
          <ChevronsUpDown size={13} className="text-muted" />
        )}
      </button>
    </th>
  );
}

export function Td({ children, className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`border-b border-stroke/60 px-4 py-2.5 text-ink ${className}`} {...props}>
      {children}
    </td>
  );
}
