import { useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

/**
 * Painel de filtros recolhível — em várias telas os filtros (busca + 2-5
 * selects/datas) ocupavam uma faixa fixa grande no topo, sempre visível,
 * mesmo quando ninguém está filtrando. Aqui ficam escondidos atrás de um
 * botão "Filtros", abrindo sozinho quando já existe algum filtro ativo
 * (ex.: ao voltar navegação) pra não esconder um filtro em uso sem avisar.
 */
export function FiltrosPanel({ children, ativos = 0 }: { children: ReactNode; ativos?: number }) {
  const [aberto, setAberto] = useState(ativos > 0);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-fit items-center gap-1.5 rounded-md border border-stroke bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface"
      >
        <SlidersHorizontal size={14} className="text-muted" />
        Filtros
        {ativos > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
            {ativos}
          </span>
        )}
        <ChevronDown size={14} className={`text-muted transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && children}
    </div>
  );
}
