// Paleta de gráficos do dashboard — instância validada da skill dataviz
// (references/palette.md). Categórico/ordinal/diverging ficam reservados
// para dados e são os mesmos tons em claro/escuro (já são saturados o
// bastante pra não precisar variar); status (conforme/divergente) já
// usados no resto do app permanecem fixos e nunca fazem esse papel.

export const CATEGORICO = [
  '#2563eb', // 1 azul — primary da marca
  '#eb6834', // 2 laranja
  '#1baf7a', // 3 água
  '#eda100', // 4 amarelo
  '#e87ba4', // 5 magenta
  '#008300', // 6 verde
  '#4a3aa7', // 7 violeta
  '#dc2626', // 8 vermelho — mesmo tom do danger
] as const;

// Rampa ordinal (um hue, degraus de claridade) para a Curva ABC — A é o
// degrau mais escuro (mais concentração de valor), C o mais claro.
export const ORDINAL_AZUL = {
  A: '#1d4ed8',
  B: '#2563eb',
  C: '#93c5fd',
};

// Par divergente (polo frio/quente) para valores positivo/negativo.
export const DIVERGENTE = {
  positivo: '#2563eb', // sobra
  negativo: '#dc2626', // falta
  neutro: '#f1f5f9',
};

// Referenciam as CSS custom properties de theme/tokens.css (não as classes
// Tailwind) — SVG aceita var() direto em fill/stroke, e assim o gráfico
// acompanha a troca de tema sem precisar recalcular nada em JS.
export const TINTA = {
  primaria: 'var(--x-ink)',
  secundaria: 'var(--x-ink)',
  muted: 'var(--x-muted)',
  grade: 'var(--x-stroke)',
  eixo: 'var(--x-stroke)',
};
