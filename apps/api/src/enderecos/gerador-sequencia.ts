import { BadRequestException } from '@nestjs/common';
import { SegmentoFaixaDto } from './dto/endereco.dto';

/**
 * Resolve um segmento (fixo ou faixa) numa lista de valores.
 * Faixa numérica preserva o zero-padding do "início" (ex.: 900→990 passo
 * 10 dá "900","910"...,"990"); faixa de letra única vai A→Z.
 */
export function gerarSequencia(segmento: SegmentoFaixaDto): string[] {
  if (segmento.tipo === 'fixo') {
    if (!segmento.valor || segmento.valor.trim() === '') {
      throw new BadRequestException('Valor fixo é obrigatório para este segmento.');
    }
    return [segmento.valor.trim()];
  }

  const inicio = segmento.inicio?.trim();
  const fim = segmento.fim?.trim();
  const passo = segmento.passo && segmento.passo > 0 ? segmento.passo : 1;
  if (!inicio || !fim) {
    throw new BadRequestException('Início e fim são obrigatórios numa faixa.');
  }

  if (/^[A-Za-z]$/.test(inicio) && /^[A-Za-z]$/.test(fim)) {
    const ini = inicio.toUpperCase().charCodeAt(0);
    const end = fim.toUpperCase().charCodeAt(0);
    if (ini > end) throw new BadRequestException(`Faixa de letra inválida: "${inicio}" a "${fim}".`);
    const letras: string[] = [];
    for (let c = ini; c <= end; c += passo) letras.push(String.fromCharCode(c));
    return letras;
  }

  const iniNum = Number(inicio);
  const fimNum = Number(fim);
  if (!Number.isFinite(iniNum) || !Number.isFinite(fimNum)) {
    throw new BadRequestException(`Faixa inválida: "${inicio}" a "${fim}" não é numérica nem letra única.`);
  }
  if (iniNum > fimNum) {
    throw new BadRequestException(`Início da faixa (${inicio}) maior que o fim (${fim}).`);
  }
  const largura = inicio.length;
  const valores: string[] = [];
  for (let n = iniNum; n <= fimNum; n += passo) {
    valores.push(String(n).padStart(largura, '0'));
  }
  return valores;
}
