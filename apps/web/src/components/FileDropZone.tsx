import { useRef, useState } from 'react';

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Área de upload com arrastar-e-soltar — clicável em qualquer ponto, com
 * estado visual de arquivo selecionado. Substitui o `<input type="file">`
 * cru (sem estilo nenhum do navegador) usado nas telas de importação.
 */
export function FileDropZone({
  accept,
  descricaoTipos,
  arquivo,
  onSelecionar,
  disabled = false,
}: {
  accept: string;
  descricaoTipos: string;
  arquivo: File | null;
  onSelecionar: (arquivo: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);

  const abrirSeletor = () => {
    if (!disabled) inputRef.current?.click();
  };

  const aoSoltar = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setArrastando(false);
    if (disabled) return;
    const arquivoSolto = event.dataTransfer.files?.[0];
    if (arquivoSolto) onSelecionar(arquivoSolto);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => onSelecionar(e.target.files?.[0] ?? null)}
      />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={abrirSeletor}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            abrirSeletor();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          disabled
            ? 'cursor-not-allowed border-nevoa/20 bg-concreto/50 text-nevoa'
            : arrastando
              ? 'border-latao bg-latao/10'
              : arquivo
                ? 'border-conforme/50 bg-conforme/5'
                : 'border-nevoa/40 bg-concreto/50 hover:border-latao hover:bg-latao/5'
        }`}
      >
        {arquivo ? (
          <>
            <span aria-hidden className="text-2xl">
              📄
            </span>
            <div className="text-sm font-semibold text-aco">{arquivo.name}</div>
            <div className="text-xs text-nevoa">{formatarTamanho(arquivo.size)} — clique ou arraste outro arquivo para trocar</div>
          </>
        ) : (
          <>
            <span aria-hidden className="text-2xl">
              📤
            </span>
            <div className="text-sm font-medium text-aco">Arraste um arquivo aqui ou clique para selecionar</div>
            <div className="text-xs text-nevoa">{descricaoTipos}</div>
          </>
        )}
      </div>
    </div>
  );
}
