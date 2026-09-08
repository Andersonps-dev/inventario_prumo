import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrigemTipo, Prisma, TipoMovimento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ClienteTransacao = PrismaService | Prisma.TransactionClient;

export interface RegistrarMovimentoParams {
  empresaId: number;
  produtoId: number;
  depositoId: number;
  enderecoId: number;
  tipo: TipoMovimento;
  quantidade: number; // com sinal: positivo entra, negativo sai
  custoUnitario?: number;
  origemTipo?: OrigemTipo;
  origemId?: number;
  motivo?: string;
  usuarioId: number;
}

@Injectable()
export class EstoqueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Único ponto de escrita em saldo_estoque (princípios 1 e 2 do roadmap).
   * O saldo é travado por produto+depósito+endereço — dois endereços do
   * mesmo produto não disputam o mesmo lock. `empresaId` sempre vem do
   * contexto autenticado do chamador (nunca de input direto do cliente) —
   * produto/depósito/endereço já pertencem a essa mesma empresa por
   * construção, então não revalidamos isso aqui no caminho quente de escrita.
   * Se `tx` não for informado, abre sua própria transação; se for, participa
   * da transação do chamador (ex.: efetivação de escopo).
   */
  async registrarMovimento(params: RegistrarMovimentoParams, tx?: Prisma.TransactionClient) {
    if (tx) return this.executar(params, tx);
    return this.prisma.$transaction((t) => this.executar(params, t));
  }

  private async executar(params: RegistrarMovimentoParams, client: ClienteTransacao) {
    const { empresaId, produtoId, depositoId, enderecoId, tipo, quantidade, usuarioId } = params;

    await client.$executeRaw`
      INSERT INTO saldo_estoque (empresa_id, produto_id, deposito_id, endereco_id, quantidade, atualizado_em)
      VALUES (${empresaId}, ${produtoId}, ${depositoId}, ${enderecoId}, 0, now())
      ON CONFLICT (produto_id, deposito_id, endereco_id) DO NOTHING
    `;
    const linhas = await client.$queryRaw<{ quantidade: Prisma.Decimal }[]>`
      SELECT quantidade FROM saldo_estoque
      WHERE produto_id = ${produtoId} AND deposito_id = ${depositoId} AND endereco_id = ${enderecoId} AND empresa_id = ${empresaId}
      FOR UPDATE
    `;
    const saldoAnterior = Number(linhas[0]?.quantidade ?? 0);
    const saldoPosterior = saldoAnterior + quantidade;

    const bloquearNegativo = this.config.get<string>('ESTOQUE_BLOQUEAR_NEGATIVO', 'true') === 'true';
    if (tipo !== 'AJUSTE_INVENTARIO' && bloquearNegativo && saldoPosterior < 0) {
      throw new ConflictException(
        `Movimento resultaria em saldo negativo (${saldoPosterior}) para o produto ${produtoId} no endereço ${enderecoId}.`,
      );
    }

    const movimento = await client.movimentoEstoque.create({
      data: {
        empresaId,
        produtoId,
        depositoId,
        enderecoId,
        tipo,
        quantidade,
        saldoAnterior,
        saldoPosterior,
        custoUnitario: params.custoUnitario,
        origemTipo: params.origemTipo,
        origemId: params.origemId,
        motivo: params.motivo,
        usuarioId,
      },
    });

    await client.saldoEstoque.update({
      where: { produtoId_depositoId_enderecoId: { produtoId, depositoId, enderecoId } },
      data: { quantidade: saldoPosterior },
    });

    return movimento;
  }

  /**
   * Posição de estoque por endereço — uma linha por (produto, endereço) com
   * saldo diferente de zero ali. Uma vez criada, a linha de saldo_estoque
   * nunca é apagada (só zerada) — sem esse filtro, todo produto que já
   * passou por um endereço e saiu de lá continuaria poluindo a lista pra
   * sempre, mesmo sem nada fisicamente ali.
   */
  async posicaoEstoque(empresaId: number, depositoId?: number) {
    // mov_agg pré-agregado por (produto, endereço) evita o fan-out de juntar
    // movimento_estoque (várias linhas) direto com saldo_estoque na mesma query.
    return this.prisma.$queryRaw`
      SELECT e.id AS endereco_id, e.codigo AS posicao, e.interno AS endereco_interno,
             p.id AS produto_id, p.sku, p.nome, p.unidade,
             p.estoque_minimo::float8 AS estoque_minimo,
             p.preco_custo::float8 AS preco_custo,
             s.quantidade::float8 AS saldo,
             (s.quantidade * p.preco_custo)::float8 AS valor_total,
             mov_agg.ultima AS ultima_movimentacao
      FROM saldo_estoque s
      JOIN produto p ON p.id = s.produto_id
      JOIN endereco e ON e.id = s.endereco_id
      LEFT JOIN (
        SELECT m.produto_id, m.endereco_id, MAX(m.criado_em) AS ultima
        FROM movimento_estoque m
        WHERE m.empresa_id = ${empresaId} ${depositoId ? Prisma.sql`AND m.deposito_id = ${depositoId}` : Prisma.empty}
        GROUP BY m.produto_id, m.endereco_id
      ) mov_agg ON mov_agg.produto_id = s.produto_id AND mov_agg.endereco_id = s.endereco_id
      WHERE p.ativo = true AND s.empresa_id = ${empresaId} AND s.quantidade <> 0
        ${depositoId ? Prisma.sql`AND s.deposito_id = ${depositoId}` : Prisma.empty}
      ORDER BY e.codigo ASC, p.nome ASC
    `;
  }

  /** Quebra do saldo de um produto por endereço (onde procurar fisicamente). */
  async posicaoPorEndereco(produtoId: number, empresaId: number, depositoId?: number) {
    await this.exigirProdutoDaEmpresa(produtoId, empresaId);
    return this.prisma.$queryRaw`
      SELECT e.id AS endereco_id, e.codigo, e.interno, s.quantidade::float8 AS saldo
      FROM saldo_estoque s
      JOIN endereco e ON e.id = s.endereco_id
      WHERE s.produto_id = ${produtoId} AND s.empresa_id = ${empresaId}
        ${depositoId ? Prisma.sql`AND s.deposito_id = ${depositoId}` : Prisma.empty}
        AND s.quantidade <> 0
      ORDER BY e.codigo ASC
    `;
  }

  async kardex(produtoId: number, empresaId: number) {
    await this.exigirProdutoDaEmpresa(produtoId, empresaId);
    return this.prisma.movimentoEstoque.findMany({
      where: { produtoId, empresaId },
      orderBy: { criadoEm: 'desc' },
      include: {
        usuario: { select: { nome: true } },
        deposito: { select: { nome: true } },
        endereco: { select: { codigo: true, interno: true } },
      },
    });
  }

  async registrarMovimentoManual(params: {
    empresaId: number;
    produtoId: number;
    depositoId: number;
    enderecoId: number;
    tipo: Extract<TipoMovimento, 'ENTRADA' | 'SAIDA'>;
    quantidade: number;
    motivo: string;
    usuarioId: number;
  }) {
    const quantidadeComSinal = params.tipo === 'SAIDA' ? -Math.abs(params.quantidade) : Math.abs(params.quantidade);
    return this.registrarMovimento({
      empresaId: params.empresaId,
      produtoId: params.produtoId,
      depositoId: params.depositoId,
      enderecoId: params.enderecoId,
      tipo: params.tipo,
      quantidade: quantidadeComSinal,
      motivo: params.motivo,
      origemTipo: 'MANUAL',
      usuarioId: params.usuarioId,
    });
  }

  /** Mesmo padrão 404 (nunca 200 vazio) usado no resto da API para IDs de outra empresa. */
  private async exigirProdutoDaEmpresa(produtoId: number, empresaId: number) {
    const produto = await this.prisma.produto.findUnique({ where: { id: produtoId }, select: { empresaId: true } });
    if (!produto || produto.empresaId !== empresaId) throw new NotFoundException('Produto não encontrado.');
  }
}
