import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FiltrosRelatorioDto } from './dto/filtros-relatorio.dto';

export interface LinhaRelatorioInventario {
  data: Date;
  escopoCodigo: string;
  escopoTitulo: string;
  deposito: string;
  enderecoCodigo: string;
  sku: string;
  codigoBarras: string | null;
  nome: string;
  saldoEstoque: number;
  contagem: number | null;
  diferenca: number | null;
  status: string;
}

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Relatório compilado do inventário: um item contado (ou pendente) por
   * linha, com a data da contagem, identificação do produto+endereço e a
   * comparação saldo congelado × contado × diferença.
   */
  async inventario(filtros: FiltrosRelatorioDto, empresaId: number): Promise<LinhaRelatorioInventario[]> {
    const condicoes: Prisma.Sql[] = [Prisma.sql`ei.empresa_id = ${empresaId}`, Prisma.sql`ei.status IN ('CONTADO', 'PENDENTE')`];
    if (filtros.depositoId) condicoes.push(Prisma.sql`e.deposito_id = ${filtros.depositoId}`);
    if (filtros.escopoId) condicoes.push(Prisma.sql`e.id = ${filtros.escopoId}`);
    if (filtros.enderecoId) condicoes.push(Prisma.sql`ei.endereco_id = ${filtros.enderecoId}`);
    if (filtros.dataInicio) {
      condicoes.push(Prisma.sql`COALESCE(ct.contado_em, e.aberto_em, e.criado_em) >= ${new Date(filtros.dataInicio)}`);
    }
    if (filtros.dataFim) {
      condicoes.push(Prisma.sql`COALESCE(ct.contado_em, e.aberto_em, e.criado_em) <= ${new Date(filtros.dataFim)}`);
    }
    const where = Prisma.join(condicoes, ' AND ');

    const linhas = await this.prisma.$queryRaw<
      {
        data: Date;
        escopo_codigo: string;
        escopo_titulo: string;
        deposito: string;
        endereco_codigo: string;
        sku: string;
        codigo_barras: string | null;
        nome: string;
        saldo_estoque: number;
        contagem: number | null;
        diferenca: number | null;
        status: string;
      }[]
    >(Prisma.sql`
      SELECT
        COALESCE(ct.contado_em, e.aberto_em, e.criado_em) AS data,
        e.codigo AS escopo_codigo,
        e.titulo AS escopo_titulo,
        d.nome AS deposito,
        ender.codigo AS endereco_codigo,
        p.sku, p.codigo_barras, p.nome,
        ei.saldo_congelado::float8 AS saldo_estoque,
        ei.quantidade_final::float8 AS contagem,
        ei.diferenca::float8 AS diferenca,
        ei.status
      FROM escopo_item ei
      JOIN escopo_inventario e ON e.id = ei.escopo_id
      JOIN produto p ON p.id = ei.produto_id
      JOIN deposito d ON d.id = e.deposito_id
      JOIN endereco ender ON ender.id = ei.endereco_id
      LEFT JOIN contagem ct ON ct.escopo_item_id = ei.id AND ct.status = 'VALIDA'
      WHERE ${where}
      ORDER BY data DESC, p.nome ASC
    `);

    return linhas.map((l) => ({
      data: l.data,
      escopoCodigo: l.escopo_codigo,
      escopoTitulo: l.escopo_titulo,
      deposito: l.deposito,
      enderecoCodigo: l.endereco_codigo,
      sku: l.sku,
      codigoBarras: l.codigo_barras,
      nome: l.nome,
      saldoEstoque: l.saldo_estoque,
      contagem: l.contagem,
      diferenca: l.diferenca,
      status: l.status,
    }));
  }
}
