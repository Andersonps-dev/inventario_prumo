import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Workbook } from 'exceljs';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ComprovanteService {
  constructor(private readonly prisma: PrismaService) {}

  private async carregarEscopoEfetivado(escopoId: number, empresaId: number) {
    const escopo = await this.prisma.escopoInventario.findUnique({
      where: { id: escopoId },
      include: {
        deposito: true,
        responsavel: { select: { nome: true } },
        efetivadoPorUsuario: { select: { nome: true } },
        itens: { include: { produto: true }, where: { status: { in: ['PENDENTE', 'CONTADO'] } } },
      },
    });
    if (!escopo || escopo.empresaId !== empresaId) throw new NotFoundException('Escopo de inventário não encontrado.');
    if (escopo.status !== 'EFETIVADO') throw new NotFoundException('Comprovante disponível apenas após efetivação.');
    return escopo;
  }

  async gerarPdf(escopoId: number, res: Response, empresaId: number) {
    const escopo = await this.carregarEscopoEfetivado(escopoId, empresaId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${escopo.codigo}.pdf"`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text(`Comprovante de inventário — ${escopo.codigo}`);
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#12283F');
    doc.text(`Título: ${escopo.titulo}`);
    doc.text(`Depósito: ${escopo.deposito.nome}`);
    doc.text(`Responsável: ${escopo.responsavel?.nome ?? '—'}`);
    doc.text(`Efetivado por: ${escopo.efetivadoPorUsuario?.nome ?? '—'} em ${escopo.efetivadoEm?.toLocaleString('pt-BR') ?? '—'}`);
    doc.moveDown();

    doc.fontSize(12).fillColor('#000').text('Itens', { underline: true });
    doc.moveDown(0.3);

    escopo.itens.forEach((item) => {
      const linha = `${item.produto.sku}  ${item.produto.nome}  |  congelado: ${item.saldoCongelado}  |  contado: ${item.quantidadeFinal ?? '—'}  |  diferença: ${item.diferenca ?? '—'}`;
      doc.fontSize(9).text(linha);
    });

    doc.end();
  }

  async gerarXlsx(escopoId: number, res: Response, empresaId: number) {
    const escopo = await this.carregarEscopoEfetivado(escopoId, empresaId);

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Comprovante');
    sheet.columns = [
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Produto', key: 'nome', width: 32 },
      { header: 'Saldo congelado', key: 'congelado', width: 16 },
      { header: 'Saldo na efetivação', key: 'efetivacao', width: 18 },
      { header: 'Quantidade contada', key: 'contado', width: 18 },
      { header: 'Diferença', key: 'diferenca', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'F1' };

    escopo.itens.forEach((item) => {
      sheet.addRow({
        sku: item.produto.sku,
        nome: item.produto.nome,
        congelado: Number(item.saldoCongelado),
        efetivacao: item.saldoNaEfetivacao ? Number(item.saldoNaEfetivacao) : null,
        contado: item.quantidadeFinal ? Number(item.quantidadeFinal) : null,
        diferenca: item.diferenca ? Number(item.diferenca) : null,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${escopo.codigo}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }
}
