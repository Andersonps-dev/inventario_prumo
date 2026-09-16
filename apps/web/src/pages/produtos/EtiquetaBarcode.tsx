import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export function EtiquetaBarcode({ sku, nome }: { sku: string; nome: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, sku, {
      format: 'CODE128',
      width: 1.6,
      height: 40,
      fontSize: 12,
      margin: 4,
      displayValue: true,
    });
  }, [sku]);

  return (
    <div className="etiqueta flex flex-col items-center justify-center rounded-md border border-stroke/30 bg-white p-2 text-center">
      <div className="mb-1 line-clamp-1 w-full text-[11px] font-medium text-ink">{nome}</div>
      <svg ref={svgRef} />
    </div>
  );
}
