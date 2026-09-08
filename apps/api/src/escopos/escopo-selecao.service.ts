import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriterioSelecaoDto } from './dto/escopo.dto';

export interface ParProdutoEndereco {
  produtoId: number;
  enderecoId: number;
}

@Injectable()
export class EscopoSelecaoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve um critério de seleção em pares produto+endereço — cada par vira
   * um escopo_item, com o saldo daquele endereço específico congelado.
   */
  async resolverItens(criterio: CriterioSelecaoDto, depositoId: number, empresaId: number): Promise<ParProdutoEndereco[]> {
    if (criterio.tipo === 'POR_ENDERECO') {
      return this.resolverPorEndereco(criterio, depositoId, empresaId);
    }
    const produtoIds = await this.resolverProdutoIds(criterio, empresaId);
    return this.explodirPorEndereco(produtoIds, depositoId, empresaId);
  }

  /** Cada produto vira um par por endereço onde ele tem saldo registrado no depósito (ou o sentinela, se nunca teve nenhum). */
  private async explodirPorEndereco(produtoIds: number[], depositoId: number, empresaId: number): Promise<ParProdutoEndereco[]> {
    if (produtoIds.length === 0) return [];

    const saldos = await this.prisma.saldoEstoque.findMany({
      where: { empresaId, produtoId: { in: produtoIds }, depositoId },
      select: { produtoId: true, enderecoId: true },
    });
    const enderecosPorProduto = new Map<number, number[]>();
    for (const s of saldos) {
      const lista = enderecosPorProduto.get(s.produtoId) ?? [];
      lista.push(s.enderecoId);
      enderecosPorProduto.set(s.produtoId, lista);
    }

    const sentinela = await this.prisma.endereco.findFirst({ where: { depositoId, empresaId, interno: true } });

    const pares: ParProdutoEndereco[] = [];
    for (const produtoId of produtoIds) {
      const enderecos = enderecosPorProduto.get(produtoId);
      if (enderecos && enderecos.length > 0) {
        for (const enderecoId of enderecos) pares.push({ produtoId, enderecoId });
      } else if (sentinela) {
        pares.push({ produtoId, enderecoId: sentinela.id });
      }
    }
    return pares;
  }

  /** "Conta a rua 900 a 910 inteira" — seleciona todo produto com saldo nos endereços informados, não o inverso. */
  private async resolverPorEndereco(criterio: CriterioSelecaoDto, depositoId: number, empresaId: number): Promise<ParProdutoEndereco[]> {
    if (!criterio.enderecoIds || criterio.enderecoIds.length === 0) {
      throw new BadRequestException('enderecoIds é obrigatório para o critério POR_ENDERECO.');
    }
    const saldos = await this.prisma.saldoEstoque.findMany({
      where: { empresaId, depositoId, enderecoId: { in: criterio.enderecoIds } },
      select: { produtoId: true, enderecoId: true },
    });
    return saldos.map((s) => ({ produtoId: s.produtoId, enderecoId: s.enderecoId }));
  }

  private async resolverProdutoIds(criterio: CriterioSelecaoDto, empresaId: number): Promise<number[]> {
    switch (criterio.tipo) {
      case 'CATALOGO_INTEIRO': {
        const produtos = await this.prisma.produto.findMany({
          where: { ativo: true, empresaId },
          select: { id: true },
        });
        return produtos.map((p) => p.id);
      }

      case 'CURVA_A_CUSTO': {
        if (criterio.valorMinimoCusto === undefined) {
          throw new BadRequestException('valorMinimoCusto é obrigatório para este critério.');
        }
        const produtos = await this.prisma.produto.findMany({
          where: { ativo: true, empresaId, precoCusto: { gte: criterio.valorMinimoCusto } },
          select: { id: true },
        });
        return produtos.map((p) => p.id);
      }

      case 'NAO_CONTADOS_HA_N_DIAS': {
        if (!criterio.dias) throw new BadRequestException('dias é obrigatório para este critério.');
        const limite = new Date();
        limite.setDate(limite.getDate() - criterio.dias);

        const linhas = await this.prisma.$queryRaw<{ id: number }[]>`
          SELECT p.id FROM produto p
          LEFT JOIN (
            SELECT ei.produto_id, MAX(c.contado_em) AS ultima_contagem
            FROM contagem c
            JOIN escopo_item ei ON ei.id = c.escopo_item_id
            WHERE ei.empresa_id = ${empresaId}
            GROUP BY ei.produto_id
          ) uc ON uc.produto_id = p.id
          WHERE p.ativo = true AND p.empresa_id = ${empresaId} AND (uc.ultima_contagem IS NULL OR uc.ultima_contagem < ${limite})
        `;
        return linhas.map((l) => l.id);
      }

      case 'LISTA_SKUS': {
        // trim/filtro aqui, não só do lado do cliente — um SKU colado com
        // espaço ao redor ("  2001751  ", comum ao colar de planilha) não
        // bate com o SKU real armazenado, e o escopo abria com 0 itens
        // sem nenhuma pista do motivo.
        const skus = (criterio.skus ?? []).map((s) => s.trim()).filter(Boolean);
        if (skus.length === 0) {
          throw new BadRequestException('skus é obrigatório para este critério.');
        }
        const produtos = await this.prisma.produto.findMany({
          where: { ativo: true, empresaId, sku: { in: skus } },
          select: { id: true },
        });
        return produtos.map((p) => p.id);
      }

      case 'SELECAO_MANUAL': {
        if (!criterio.produtoIds || criterio.produtoIds.length === 0) {
          throw new BadRequestException('produtoIds é obrigatório para este critério.');
        }
        // Nunca confia cegamente em IDs vindos do cliente — só passam os
        // que realmente pertencem a esta empresa.
        const produtos = await this.prisma.produto.findMany({
          where: { id: { in: criterio.produtoIds }, empresaId },
          select: { id: true },
        });
        return produtos.map((p) => p.id);
      }

      default:
        throw new BadRequestException('Critério de seleção inválido.');
    }
  }
}
