import { useState } from 'react';
import { TINTA } from '../../theme/chart-tokens';

interface Serie {
  nome: string;
  valores: number[];
  cor: string;
}

const LARGURA_VIEWBOX = 600;

export function LineChart({
  rotulosEixoX,
  series,
  altura = 180,
  minimo = 0,
  maximo = 100,
}: {
  rotulosEixoX: string[];
  series: Serie[];
  altura?: number;
  minimo?: number;
  maximo?: number;
}) {
  const [pontoAtivo, setPontoAtivo] = useState<number | null>(null);
  const n = rotulosEixoX.length;
  if (n === 0) return <div className="text-sm text-muted">Sem inventários efetivados no período.</div>;

  const margem = 12;
  const largura = LARGURA_VIEWBOX - margem * 2;
  const passoX = n > 1 ? largura / (n - 1) : 0;
  const x = (i: number) => margem + i * passoX;
  const y = (v: number) => altura - ((v - minimo) / (maximo - minimo || 1)) * (altura - 16);

  return (
    <div>
      {/* viewBox largo e fixo + aspect-ratio: escala sempre uniforme, texto
          e marcadores nunca esticam. */}
      <svg
        viewBox={`0 0 ${LARGURA_VIEWBOX} ${altura}`}
        className="w-full"
        style={{ aspectRatio: `${LARGURA_VIEWBOX} / ${altura}` }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={0} x2={LARGURA_VIEWBOX} y1={altura * f} y2={altura * f} stroke={TINTA.grade} strokeWidth={1} />
        ))}
        {series.map((serie) => {
          const pontos = serie.valores.map((v, i) => `${x(i)},${y(v)}`).join(' ');
          return (
            <g key={serie.nome}>
              <polyline points={pontos} fill="none" stroke={serie.cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {serie.valores.map((v, i) => (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(v)}
                  r={pontoAtivo === i ? 6 : 4}
                  fill={serie.cor}
                  stroke="var(--x-card)"
                  strokeWidth={2}
                  onMouseEnter={() => setPontoAtivo(i)}
                  onMouseLeave={() => setPontoAtivo(null)}
                />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        {rotulosEixoX.map((r, i) => (
          <span key={i} className={pontoAtivo === i ? 'font-semibold text-ink' : ''}>
            {r}
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs">
        {series.map((s) => (
          <div key={s.nome} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.cor }} />
            <span className="text-ink">
              {s.nome}
              {pontoAtivo !== null && `: ${s.valores[pontoAtivo]?.toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
