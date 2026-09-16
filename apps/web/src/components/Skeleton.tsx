export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-stroke/60 ${className}`} />;
}

/** Linhas de tabela — mantém a forma real do conteúdo em vez de um spinner central. */
export function SkeletonLinhas({ linhas = 4, colunas = 4 }: { linhas?: number; colunas?: number }) {
  return (
    <>
      {Array.from({ length: linhas }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: colunas }).map((_, j) => (
            <td key={j} className="border-b border-stroke/60 px-4 py-2.5">
              <Skeleton className="h-4 w-full max-w-32" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
