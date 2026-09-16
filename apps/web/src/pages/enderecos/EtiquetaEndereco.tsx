import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export function EtiquetaEndereco({ codigo, setor, rua, modulo, nivel, vao }: {
  codigo: string;
  setor: string;
  rua: string;
  modulo: string;
  nivel: string;
  vao: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, codigo, {
      format: 'CODE128',
      width: 1.6,
      height: 40,
      fontSize: 12,
      margin: 4,
      displayValue: true,
    });
  }, [codigo]);

  return (
    <div className="etiqueta flex flex-col items-center justify-center rounded-md border border-stroke/30 bg-white p-2 text-center">
      <div className="mb-1 text-[11px] font-medium text-ink">
        Setor {setor} · Rua {rua} · Mód {modulo} · Nív {nivel} · Vão {vao}
      </div>
      <svg ref={svgRef} />
    </div>
  );
}
