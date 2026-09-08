import { Planilha } from '../tipos';
import { formatarValor } from './formatar';

const GATILHOS_FORMULA = ['=', '+', '-', '@', '\t', '\r'];

// Prefixa com ' células que começam com caractere de fórmula — sem isso, um
// SKU/nome tipo "=CMD(...)" vira fórmula executável ao abrir no Excel/Sheets.
function neutralizarFormula(v: string): string {
  if (v.length > 0 && GATILHOS_FORMULA.includes(v[0])) return `'${v}`;
  return v;
}

function escapar(v: string): string {
  const seguro = neutralizarFormula(v);
  if (/[;"\n\r]/.test(seguro)) return `"${seguro.replace(/"/g, '""')}"`;
  return seguro;
}

/** CSV com BOM UTF-8, separador `;` e decimal com vírgula — abre limpo no Excel pt-BR. */
export function paraCsv(planilha: Planilha): Buffer {
  const BOM = '﻿';
  const linhas = [planilha.colunas.map((c) => escapar(c.titulo)).join(';')];
  for (const linha of planilha.linhas) {
    linhas.push(planilha.colunas.map((c) => escapar(formatarValor(linha[c.chave]))).join(';'));
  }
  return Buffer.from(BOM + linhas.join('\r\n'), 'utf-8');
}
