import { useState } from 'react';
import { TINTA } from '../../theme/chart-tokens';

interface Barra {
  rotulo: string;
  valor: number;
  cor: string;
  detalhe?: string;
}

const LARGURA_VIEWBOX = 400;

export function BarChart({
  dados,
  altura = 180,
  formatarValor = (n: number) => n.toLocaleString('pt-BR'),
}: {
  dados: Barra[];
  altura?: number;
  formatarValor?: (n: number) => string;
}) {
  const [emFoco, setEmFoco] = useState<number | null>(null);
  const maximo = Math.max(1, ...dados.map((d) => d.valor));
  const larguraBanda = LARGURA_VIEWBOX / dados.length;

  return (
    <div>
      {/* viewBox e aspect-ratio combinam para que a escala seja uniforme —
          sem isso, texto e cantos arredondados saem distorcidos. */}
      <svg
        viewBox={`0 0 ${LARGURA_VIEWBOX} ${altura}`}
        className="w-full"
        style={{ aspectRatio: `${LARGURA_VIEWBOX} / ${altura}` }}
      >
        <line x1={0} y1={altura - 1} x2={LARGURA_VIEWBOX} y2={altura - 1} stroke={TINTA.eixo} strokeWidth={1} />
        {dados.map((d, i) => {
          const alturaBarra = (d.valor / maximo) * (altura - 28);
          const centroBanda = larguraBanda * i + larguraBanda / 2;
          const larguraBarra = Math.min(40, larguraBanda * 0.5);
          return (
            <g key={d.rotulo} onMouseEnter={() => setEmFoco(i)} onMouseLeave={() => setEmFoco(null)}>
              <rect
                x={centroBanda - larguraBarra / 2}
                y={altura - alturaBarra}
                width={larguraBarra}
                height={Math.max(alturaBarra, 1)}
                rx={4}
                fill={d.cor}
                opacity={emFoco === null || emFoco === i ? 1 : 0.45}
              />
              <text x={centroBanda} y={altura - alturaBarra - 8} textAnchor="middle" fontSize={13} fill={TINTA.secundaria}>
                {formatarValor(d.valor)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex text-xs text-nevoa">
        {dados.map((d, i) => (
          <div
            key={d.rotulo}
            style={{ width: `${100 / dados.length}%` }}
            className={`text-center ${emFoco === i ? 'font-semibold text-aco' : ''}`}
          >
            {d.rotulo}
            {d.detalhe && <div className="text-[10px] text-nevoa">{d.detalhe}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
