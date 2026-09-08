import { Workbook } from 'exceljs';
import { Planilha } from '../tipos';

/** XLSX multi-aba, cabeçalho em negrito e congelado, filtro automático. */
export async function paraXlsx(planilhas: Planilha[]): Promise<Buffer> {
  const workbook = new Workbook();
  for (const planilha of planilhas) {
    const sheet = workbook.addWorksheet(planilha.nome.slice(0, 31));
    sheet.columns = planilha.colunas.map((c) => ({ header: c.titulo, key: c.chave, width: 20 }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: planilha.colunas.length } };

    for (const linha of planilha.linhas) {
      sheet.addRow(linha);
    }
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
