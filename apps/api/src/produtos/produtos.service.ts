import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../common/auditoria/auditoria.service';
import { CriarProdutoDto, AtualizarProdutoDto, ListarProdutosQueryDto } from './dto/produto.dto';

interface LinhaProdutoListagem {
  id: number;
  sku: string;
  codigo_barras: string | null;
  nome: string;
  unidade: string;
  preco_custo: number;
  estoque_minimo: number;
  ativo: boolean;
  saldo: number;
}

@Injectable()
export class ProdutosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(query: ListarProdutosQueryDto, empresaId: number) {
    const pagina = query.pagina ?? 1;
    const tamanhoPagina = Math.min(query.tamanhoPagina ?? 20, 200);

    const condicoes: Prisma.Sql[] = [Prisma.sql`p.empresa_id = ${empresaId}`];
    if (query.busca) {
      const termo = `%${query.busca}%`;
      condicoes.push(
        Prisma.sql`(p.nome ILIKE ${termo} OR p.sku ILIKE ${termo} OR p.codigo_barras ILIKE ${termo})`,
      );
    }
    if (query.ativo !== undefined) condicoes.push(Prisma.sql`p.ativo = ${query.ativo}`);

    const whereClause = Prisma.join(condicoes, ' AND ');
    const havingClause = query.abaixoDoMinimo
      ? Prisma.sql`HAVING COALESCE(SUM(s.quantidade), 0) < p.estoque_minimo`
      : Prisma.empty;

    const base = Prisma.sql`
      SELECT p.id, p.sku, p.codigo_barras, p.nome,
             p.unidade, p.preco_custo::float8 AS preco_custo, p.estoque_minimo::float8 AS estoque_minimo,
             p.ativo, COALESCE(SUM(s.quantidade), 0)::float8 AS saldo
      FROM produto p
      LEFT JOIN saldo_estoque s ON s.produto_id = p.id
      WHERE ${whereClause}
      GROUP BY p.id
      ${havingClause}
    `;

    const [linhas, totalRows] = await Promise.all([
      this.prisma.$queryRaw<LinhaProdutoListagem[]>(Prisma.sql`
        ${base} ORDER BY p.nome ASC LIMIT ${tamanhoPagina} OFFSET ${(pagina - 1) * tamanhoPagina}
      `),
      this.prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total FROM (${base}) t
      `),
    ]);

    return {
      itens: linhas.map((l) => ({
        id: l.id,
        sku: l.sku,
        codigoBarras: l.codigo_barras,
        nome: l.nome,
        unidade: l.unidade,
        precoCusto: l.preco_custo,
        estoqueMinimo: l.estoque_minimo,
        ativo: l.ativo,
        saldo: l.saldo,
        abaixoDoMinimo: l.saldo < l.estoque_minimo,
      })),
      pagina,
      tamanhoPagina,
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  async buscarPorId(id: number, empresaId: number) {
    const produto = await this.prisma.produto.findUnique({ where: { id } });
    if (!produto || produto.empresaId !== empresaId) throw new NotFoundException('Produto não encontrado.');
    return produto;
  }

  private async validarUnicidade(sku: string, codigoBarras: string | undefined, empresaId: number, ignorarId?: number) {
    const skuExistente = await this.prisma.produto.findFirst({
      where: { sku, empresaId, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
    });
    if (skuExistente) throw new ConflictException(`SKU "${sku}" já está em uso.`);

    if (codigoBarras) {
      const codigoExistente = await this.prisma.produto.findFirst({
        where: { codigoBarras, empresaId, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
      });
      if (codigoExistente) throw new ConflictException(`Código de barras "${codigoBarras}" já está em uso.`);
    }
  }

  async criar(dto: CriarProdutoDto, usuarioId: number, empresaId: number) {
    await this.validarUnicidade(dto.sku, dto.codigoBarras, empresaId);

    const produto = await this.prisma.produto.create({
      data: {
        empresaId,
        sku: dto.sku,
        codigoBarras: dto.codigoBarras,
        nome: dto.nome,
        descricao: dto.descricao,
        unidade: dto.unidade ?? 'UN',
        precoCusto: dto.precoCusto ?? 0,
        estoqueMinimo: dto.estoqueMinimo ?? 0,
      },
    });

    await this.auditoria.registrar({
      entidade: 'produto',
      entidadeId: produto.id,
      acao: 'CRIAR',
      depois: { ...produto, precoCusto: produto.precoCusto.toString(), estoqueMinimo: produto.estoqueMinimo.toString() },
      usuarioId,
      empresaId,
    });

    return produto;
  }

  async atualizar(id: number, dto: AtualizarProdutoDto, usuarioId: number, empresaId: number) {
    const antes = await this.prisma.produto.findUnique({ where: { id } });
    if (!antes || antes.empresaId !== empresaId) throw new NotFoundException('Produto não encontrado.');

    if (dto.codigoBarras !== undefined) {
      await this.validarUnicidade(antes.sku, dto.codigoBarras, empresaId, id);
    }

    const depois = await this.prisma.produto.update({ where: { id }, data: dto });

    await this.auditoria.registrar({
      entidade: 'produto',
      entidadeId: id,
      acao: dto.ativo === false ? 'CANCELAR' : 'EDITAR',
      antes: { ...antes, precoCusto: antes.precoCusto.toString(), estoqueMinimo: antes.estoqueMinimo.toString() },
      depois: { ...depois, precoCusto: depois.precoCusto.toString(), estoqueMinimo: depois.estoqueMinimo.toString() },
      usuarioId,
      empresaId,
    });

    return depois;
  }
}
