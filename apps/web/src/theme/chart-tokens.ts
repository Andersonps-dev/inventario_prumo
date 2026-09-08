// Paleta de gráficos do dashboard — instância validada da skill dataviz
// (references/palette.md), light-mode apenas (o app ainda não tem tema
// escuro). Categórico/ordinal/diverging ficam reservados para dados;
// status (conforme/divergente) já usados no resto do app permanecem
// fixos e nunca fazem esse papel.

export const CATEGORICO = [
  '#2a78d6', // 1 azul
  '#eb6834', // 2 laranja
  '#1baf7a', // 3 água
  '#eda100', // 4 amarelo
  '#e87ba4', // 5 magenta
  '#008300', // 6 verde
  '#4a3aa7', // 7 violeta
  '#e34948', // 8 vermelho
] as const;

// Rampa ordinal (um hue, degraus de claridade) para a Curva ABC — A é o
// degrau mais escuro (mais concentração de valor), C o mais claro.
export const ORDINAL_AZUL = {
  A: '#184f95',
  B: '#2a78d6',
  C: '#86b6ef',
};

// Par divergente (polo frio/quente) para valores positivo/negativo.
export const DIVERGENTE = {
  positivo: '#2a78d6', // sobra
  negativo: '#e34948', // falta
  neutro: '#f0efec',
};

export const TINTA = {
  primaria: '#12283f', // aço — ink do Prumo
  secundaria: '#52514e',
  muted: '#8fa6b8', // névoa
  grade: '#e1e0d9',
  eixo: '#c3c2b7',
};
