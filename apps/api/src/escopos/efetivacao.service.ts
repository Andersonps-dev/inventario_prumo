import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../common/auditoria/auditoria.service';
import { EstoqueService } from '../estoque/estoque.service';
import { DashboardService } from '../dashboard/dashboard.service';

export interface ItemConferencia {
  itemId: number;
  produtoId: number;
  sku: string;
  nome: string;
  enderecoCodigo: string;
  status: 'PENDENTE' | 'CONTADO';
  saldoCongelado: number;
  saldoAtual: number;
  saldoAlterado: boolean;
  quantidadeContada: number | null;
  diferenca: number | null;
  precoCusto: number;
  impactoReais: number;
}

@Injectable()
export class EfetivacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly estoqueService: EstoqueService,
    private readonly dashboardService: DashboardService,
  ) {}

  async conferencia(escopoId: number, empresaId: number) {
    const escopo = await this.prisma.escopoInventario.findUnique({
      where: { id: escopoId },
      include: {
        itens: {
          where: { status: { in: ['PENDENTE', 'CONTADO'] } },
          include: { produto: true, endereco: { select: { codigo: true } } },
        },
      },
    });
    if (!escopo || escopo.empresaId !== empresaId) throw new NotFoundException('Escopo de inventário não encontrado.');

    // Para escopo já EFETIVADO o registro é imutável: usamos o saldo e a
    // diferença gravados na efetivação, não uma releitura ao vivo (que
    // derivaria com o tempo por movimentos alheios ao inventário).
    const congelarHistorico = escopo.status === 'EFETIVADO';
    const chave = (produtoId: number, enderecoId: number) => `${produtoId}:${enderecoId}`;
    const saldoPorPar = congelarHistorico
      ? new Map(
          escopo.itens.map((i) => [
            chave(i.produtoId, i.enderecoId),
            i.saldoNaEfetivacao === null ? null : Number(i.saldoNaEfetivacao),
          ]),
        )
      : new Map(
          (
            await this.prisma.saldoEstoque.findMany({
              where: {
                empresaId,
                depositoId: escopo.depositoId,
                produtoId: { in: escopo.itens.map((i) => i.produtoId) },
                enderecoId: { in: escopo.itens.map((i) => i.enderecoId) },
              },
            })
          ).map((s) => [chave(s.produtoId, s.enderecoId), Number(s.quantidade)] as [string, number]),
        );

    const itens: ItemConferencia[] = escopo.itens.map((item) => {
      const saldoAtual = saldoPorPar.get(chave(item.produtoId, item.enderecoId)) ?? 0;
      const saldoCongelado = Number(item.saldoCongelado);
      const quantidadeContada = item.quantidadeFinal === null ? null : Number(item.quantidadeFinal);
      const diferenca = congelarHistorico
        ? item.diferenca === null
          ? null
          : Number(item.diferenca)
        : quantidadeContada === null
          ? null
          : quantidadeContada - saldoAtual;
      const precoCusto = Number(item.produto.precoCusto);
      return {
        itemId: item.id,
        produtoId: item.produtoId,
        sku: item.produto.sku,
        nome: item.produto.nome,
        enderecoCodigo: item.endereco.codigo,
        status: item.status as 'PENDENTE' | 'CONTADO',
        saldoCongelado,
        saldoAtual,
        saldoAlterado: saldoAtual !== saldoCongelado,
        quantidadeContada,
        diferenca,
        precoCusto,
        impactoReais: diferenca === null ? 0 : diferenca * precoCusto,
      };
    });

    itens.sort((a, b) => Math.abs(b.impactoReais) - Math.abs(a.impactoReais));

    const contados = itens.filter((i) => i.status === 'CONTADO');
    const pendentes = itens.filter((i) => i.status === 'PENDENTE');
    const divergenciaTotalUnidades = contados.reduce((soma, i) => soma + (i.diferenca ?? 0), 0);
    const divergenciaTotalReais = contados.reduce((soma, i) => soma + i.impactoReais, 0);

    return {
      escopo: { id: escopo.id, codigo: escopo.codigo, titulo: escopo.titulo, status: escopo.status },
      itens,
      resumo: {
        totalItens: itens.length,
        itensContados: contados.length,
        itensPendentes: pendentes.length,
        divergenciaTotalUnidades,
        divergenciaTotalReais,
      },
    };
  }

  async efetivar(escopoId: number, politicaPendentes: 'IGNORAR' | 'ZERAR', usuarioId: number, empresaId: number) {
    const resultado = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.escopoInventario.updateMany({
        where: { id: escopoId, empresaId, status: 'CONFERENCIA' },
        data: { status: 'EFETIVADO', efetivadoPor: usuarioId, efetivadoEm: new Date() },
      });
      if (claim.count === 0) {
        throw new ConflictException('Escopo não está em CONFERENCIA ou já foi efetivado (ação idempotente).');
      }

      const escopo = await tx.escopoInventario.findUniqueOrThrow({ where: { id: escopoId } });
      const itens = await tx.escopoItem.findMany({
        where: { escopoId, status: { in: ['PENDENTE', 'CONTADO'] } },
      });

      let itensAjustados = 0;

      for (const item of itens) {
        const alvo =
          item.status === 'CONTADO'
            ? Number(item.quantidadeFinal)
            : politicaPendentes === 'ZERAR'
              ? 0
              : null;

        await tx.$executeRaw`
          INSERT INTO saldo_estoque (empresa_id, produto_id, deposito_id, endereco_id, quantidade, atualizado_em)
          VALUES (${empresaId}, ${item.produtoId}, ${escopo.depositoId}, ${item.enderecoId}, 0, now())
          ON CONFLICT (produto_id, deposito_id, endereco_id) DO NOTHING
        `;
        const linhas = await tx.$queryRaw<{ quantidade: unknown }[]>`
          SELECT quantidade FROM saldo_estoque
          WHERE produto_id = ${item.produtoId} AND deposito_id = ${escopo.depositoId} AND endereco_id = ${item.enderecoId} AND empresa_id = ${empresaId}
          FOR UPDATE
        `;
        const saldoNaEfetivacao = Number(linhas[0]?.quantidade ?? 0);
        const diferenca = alvo === null ? null : alvo - saldoNaEfetivacao;

        if (diferenca !== null && diferenca !== 0) {
          await this.estoqueService.registrarMovimento(
            {
              empresaId,
              produtoId: item.produtoId,
              depositoId: escopo.depositoId,
              enderecoId: item.enderecoId,
              tipo: 'AJUSTE_INVENTARIO',
              quantidade: diferenca,
              origemTipo: 'ESCOPO_ITEM',
              origemId: item.id,
              usuarioId,
            },
            tx,
          );
          itensAjustados += 1;
        }

        await tx.escopoItem.update({
          where: { id: item.id },
          data: { saldoNaEfetivacao, diferenca: diferenca ?? undefined },
        });
      }

      await this.auditoria.registrar(
        {
          entidade: 'escopo_inventario',
          entidadeId: escopoId,
          acao: 'EFETIVAR',
          depois: { politicaPendentes, itensAjustados, totalItens: itens.length },
          usuarioId,
          empresaId,
        },
        tx,
      );

      return { escopoId, itensAjustados, totalItens: itens.length };
    });

    this.dashboardService.invalidarCache();
    return resultado;
  }
}
