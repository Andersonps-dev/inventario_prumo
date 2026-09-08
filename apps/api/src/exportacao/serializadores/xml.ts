import { Planilha } from '../tipos';
import { formatarValor } from './formatar';

function escaparXml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Schema genérico documentado em `xsd/prumo-exportacao.xsd`. */
export function paraXml(tipo: string, planilha: Planilha): Buffer {
  const linhasXml = planilha.linhas
    .map((linha) => {
      const campos = planilha.colunas
        .map((c) => `      <${c.chave}>${escaparXml(formatarValor(linha[c.chave]))}</${c.chave}>`)
        .join('\n');
      return `    <linha>\n${campos}\n    </linha>`;
    })
    .join('\n');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<exportacao xmlns="urn:prumo:exportacao" tipo="${tipo}" geradoEm="${new Date().toISOString()}">\n` +
    `${linhasXml}\n` +
    `</exportacao>\n`;

  return Buffer.from(xml, 'utf-8');
}
