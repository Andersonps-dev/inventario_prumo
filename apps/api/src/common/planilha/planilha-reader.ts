import { parse } from 'csv-parse/sync';
import { Workbook } from 'exceljs';
import { BadRequestException } from '@nestjs/common';

/** true para .xlsx/.xls, false pra tratar como CSV (padrão, inclusive sem extensão reconhecida). */
function ehExcel(nomeArquivo: string): boolean {
  const ext = nomeArquivo.toLowerCase().split('.').pop();
  return ext === 'xlsx' || ext === 'xls';
}

/** Detecta `;` vs `,` pela primeira linha — Excel em pt-BR exporta com `;` (decimal usa vírgula). */
function detectarDelimitadorCsv(buffer: Buffer): string {
  const primeiraLinha = buffer.toString('utf-8').split(/\r?\n/, 1)[0] ?? '';
  const pontoEVirgula = (primeiraLinha.match(/;/g) ?? []).length;
  const virgula = (primeiraLinha.match(/,/g) ?? []).length;
  return virgula > pontoEVirgula ? ',' : ';';
}

function lerCsv(buffer: Buffer): Record<string, string>[] {
  const delimiter = detectarDelimitadorCsv(buffer);
  return parse(buffer, {
    columns: (header: string[]) => header.map((h) => h.trim()),
    delimiter,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

async function lerXlsx(buffer: Buffer): Promise<Record<string, string>[]> {
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const cabecalho: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumero) => {
    cabecalho[colNumero - 1] = String(cell.value ?? '').trim();
  });

  const linhas: Record<string, string>[] = [];
  sheet.eachRow((row, numeroLinha) => {
    if (numeroLinha === 1) return;
    const linha: Record<string, string> = {};
    let temConteudo = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumero) => {
      const chave = cabecalho[colNumero - 1];
      if (!chave) return;
      // Célula numérica do Excel vem em ponto decimal (99.9) — o resto do
      // sistema espera texto em vírgula decimal (convenção pt-BR já usada
      // em toda a importação/exportação). Sem isso, "99.9" seria lido como
      // "999" pelo parser de número (que trata ponto como separador de milhar).
      const valor =
        cell.value === null || cell.value === undefined
          ? ''
          : typeof cell.value === 'number'
            ? String(cell.value).replace('.', ',')
            : String(cell.value).trim();
      if (valor) temConteudo = true;
      linha[chave] = valor;
    });
    if (temConteudo) linhas.push(linha);
  });
  return linhas;
}

/** Lê todas as linhas de um CSV ou XLSX, mantendo os nomes de coluna originais do arquivo. */
export async function lerLinhas(buffer: Buffer, nomeArquivo: string): Promise<Record<string, string>[]> {
  try {
    return ehExcel(nomeArquivo) ? await lerXlsx(buffer) : lerCsv(buffer);
  } catch {
    throw new BadRequestException('Não foi possível ler o arquivo — confira se é um .csv ou .xlsx válido.');
  }
}

/** Só o cabeçalho — usado no passo de mapeamento antes de processar o arquivo inteiro. */
export async function lerColunas(buffer: Buffer, nomeArquivo: string): Promise<string[]> {
  const linhas = await lerLinhas(buffer, nomeArquivo);
  if (linhas.length === 0) return [];
  return Object.keys(linhas[0]);
}

/**
 * Converte texto de planilha em número, aceitando decimal com vírgula
 * (pt-BR, "1.234,56") ou com ponto ("19.90", comum em CSV cru/máquina) —
 * decide pelo texto original recebido. A detecção só olha `,`: sem vírgula
 * nenhuma, o ponto (se houver) é tratado como decimal, nunca como milhar.
 * Também aceita valor formatado como moeda (ex.: "R$ 16,43", "US$ 1.234,56")
 * — descarta tudo que não for dígito, vírgula, ponto ou sinal de menos
 * antes de interpretar, já que planilhas de ERP costumam exportar preço
 * assim em vez de número puro.
 */
export function paraNumero(valor: string | undefined): number | null {
  if (!valor || valor.trim() === '') return 0;
  const bruto = valor.trim().replace(/[^\d,.-]/g, '');
  if (!bruto) return null;
  const normalizado = bruto.includes(',') ? bruto.replace(/\./g, '').replace(',', '.') : bruto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}
