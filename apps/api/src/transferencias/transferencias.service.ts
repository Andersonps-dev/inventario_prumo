import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DepositosService } from '../depositos/depositos.service';
import { EstoqueService } from '../estoque/estoque.service';
import { AuditoriaService } from '../common/auditoria/auditoria.service';
import { BipagemTransferenciaDto, CriarTransferenciaDto } from './dto/transferencia.dto';

@Injectable()
export class TransferenciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly depositosService: DepositosService,
    private readonly estoqueService: EstoqueService,
    private readonly auditoria: AuditoriaService,
  ) {}

  private async gerarCodigo(empresaId: number): Promise<string> {
    const ano = new Date().getFullYear();
    const quantidade = await this.prisma.transferencia.count({
      where: { empresaId, codigo: { startsWith: `TRF-${ano}-` } },
    });
    return `TRF-${ano}-${String(quantidade + 1).padStart(4, '0')}`;
  }

  listar(empresaId: number, status?: string) {
    return this.prisma.transferencia.findMany({
      where: { empresaId, ...(status ? { status: status as never } : {}) },
      include: {
        deposito: { select: { nome: true } },
        enderecoOrigem: { select: { codigo: true, interno: true } },
        enderecoDestino: { select: { codigo: true, interno: true } },
        criadoPorUsuario: { select: { nome: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async buscarPorId(id: number, empresaId: number) {
    const transferencia = await this.prisma.transferencia.findUnique({
      where: { id },
      include: {
        deposito: { select: { id: true, nome: true } },
        enderecoOrigem: { select: { id: true, codigo: true, interno: true } },
        enderecoDestino: { select: { id: true, codigo: true, interno: true } },
        criadoPorUsuario: { select: { nome: true } },
        efetivadoPorUsuario: { select: { nome: true } },
        canceladoPorUsuario: { select: { nome: true } },
        itens: {
          include: { produto: { select: { id: true, sku: true, codigoBarras: true, nome: true, unidade: true, precoCusto: true } } },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!transferencia || transferencia.empresaId !== empresaId) throw new NotFoundException('Transferência não encontrada.');
    return transferencia;
  }

  /** Cria a transferência já com origem e destino fixos — os itens entram depois, um bipe de cada vez. */
  async criar(dto: CriarTransferenciaDto, usuarioId: number, empresaId: number) {
    const deposito = await this.depositosService.exigirAtivo(dto.depositoId, empresaId);
    if (dto.enderecoOrigemId === dto.enderecoDestinoId) {
      throw new BadRequestException('Origem e destino precisam ser posições diferentes.');
    }

    const enderecos = await this.prisma.endereco.findMany({
      where: { id: { in: [dto.enderecoOrigemId, dto.enderecoDestinoId] }, empresaId, depositoId: deposito.id },
    });
    if (enderecos.length !== 2) {
      throw new BadRequestException('Origem e destino precisam ser endereços deste depósito.');
    }

    const codigo = await this.gerarCodigo(empresaId);
    const transferencia = await this.prisma.transferencia.create({
      data: {
        empresaId,
        codigo,
        depositoId: deposito.id,
        enderecoOrigemId: dto.enderecoOrigemId,
        enderecoDestinoId: dto.enderecoDestinoId,
        criadoPor: usuarioId,
      },
    });

    await this.auditoria.registrar({
      entidade: 'transferencia',
      entidadeId: transferencia.id,
      acao: 'CRIAR',
      depois: transferencia,
      usuarioId,
      empresaId,
    });

    return this.buscarPorId(transferencia.id, empresaId);
  }

  /**
   * Bipa um produto pra somar na transferência — checagem de saldo aqui é
   * só pra pegar erro cedo (mesmo padrão do `reservar` do grêmio, mas sem
   * criar reserva de verdade, já que é só contagem até efetivar): se o
   * saldo mudar entre a bipagem e o efetivar, `efetivar` revalida de novo
   * através do próprio `registrarMovimento`.
   */
  async registrarBipagem(id: number, dto: BipagemTransferenciaDto, usuarioId: number, empresaId: number) {
    const transferencia = await this.prisma.transferencia.findUnique({ where: { id } });
    if (!transferencia || transferencia.empresaId !== empresaId) throw new NotFoundException('Transferência não encontrada.');
    if (transferencia.status !== 'ABERTA') throw new ConflictException('Esta transferência não está mais aberta.');

    const produto = await this.prisma.produto.findUnique({ where: { id: dto.produtoId } });
    if (!produto || produto.empresaId !== empresaId) throw new BadRequestException('Produto não pertence a esta empresa.');

    await this.prisma.$transaction(async (tx) => {
      const linhasSaldo = await tx.$queryRaw<{ quantidade: Prisma.Decimal }[]>`
        SELECT quantidade FROM saldo_estoque
        WHERE produto_id = ${dto.produtoId} AND deposito_id = ${transferencia.depositoId} AND endereco_id = ${transferencia.enderecoOrigemId} AND empresa_id = ${empresaId}
        FOR UPDATE
      `;
      const saldoAtual = Number(linhasSaldo[0]?.quantidade ?? 0);

      const itemExistente = await tx.transferenciaItem.findUnique({
        where: { transferenciaId_produtoId: { transferenciaId: id, produtoId: dto.produtoId } },
      });
      const jaBipado = Number(itemExistente?.quantidade ?? 0);
      const novoTotal = jaBipado + dto.quantidade;

      if (novoTotal > saldoAtual) {
        throw new ConflictException(`Estoque insuficiente na posição de origem: saldo ${saldoAtual}, já bipado ${jaBipado}.`);
      }

      await tx.transferenciaItem.upsert({
        where: { transferenciaId_produtoId: { transferenciaId: id, produtoId: dto.produtoId } },
        create: { empresaId, transferenciaId: id, produtoId: dto.produtoId, quantidade: dto.quantidade },
        update: { quantidade: { increment: dto.quantidade } },
      });

      await this.auditoria.registrar(
        { entidade: 'transferencia', entidadeId: id, acao: 'EDITAR', depois: { itemBipado: dto }, usuarioId, empresaId },
        tx,
      );
    });

    return this.buscarPorId(id, empresaId);
  }

  /** Efetiva: baixa da origem e credita no destino, um movimento real por item. Revalida saldo no momento (pode ter mudado desde a bipagem). */
  async efetivar(id: number, usuarioId: number, empresaId: number) {
    const transferencia = await this.prisma.transferencia.findUnique({
      where: { id },
      include: { itens: true },
    });
    if (!transferencia || transferencia.empresaId !== empresaId) throw new NotFoundException('Transferência não encontrada.');
    if (transferencia.status !== 'ABERTA') throw new ConflictException('Esta transferência não está mais aberta.');
    if (transferencia.itens.length === 0) throw new BadRequestException('Bipe ao menos um produto antes de efetivar.');

    const atualizada = await this.prisma.$transaction(async (tx) => {
      for (const item of transferencia.itens) {
        await this.estoqueService.registrarMovimento(
          {
            empresaId,
            produtoId: item.produtoId,
            depositoId: transferencia.depositoId,
            enderecoId: transferencia.enderecoOrigemId,
            tipo: 'TRANSFERENCIA',
            quantidade: -Number(item.quantidade),
            origemTipo: 'TRANSFERENCIA_ITEM',
            origemId: item.id,
            motivo: `Transferência ${transferencia.codigo}`,
            usuarioId,
          },
          tx,
        );
        await this.estoqueService.registrarMovimento(
          {
            empresaId,
            produtoId: item.produtoId,
            depositoId: transferencia.depositoId,
            enderecoId: transferencia.enderecoDestinoId,
            tipo: 'TRANSFERENCIA',
            quantidade: Number(item.quantidade),
            origemTipo: 'TRANSFERENCIA_ITEM',
            origemId: item.id,
            motivo: `Transferência ${transferencia.codigo}`,
            usuarioId,
          },
          tx,
        );
      }

      const depois = await tx.transferencia.update({
        where: { id },
        data: { status: 'EFETIVADA', efetivadoPor: usuarioId, efetivadoEm: new Date() },
      });

      await this.auditoria.registrar(
        { entidade: 'transferencia', entidadeId: id, acao: 'EFETIVAR', antes: transferencia, depois, usuarioId, empresaId },
        tx,
      );

      return depois;
    });

    return this.buscarPorId(atualizada.id, empresaId);
  }

  /** Só cancela enquanto ABERTA — nenhum estoque de verdade se moveu ainda, então não há nada pra reverter. */
  async cancelar(id: number, motivo: string, usuarioId: number, empresaId: number) {
    const transferencia = await this.prisma.transferencia.findUnique({ where: { id } });
    if (!transferencia || transferencia.empresaId !== empresaId) throw new NotFoundException('Transferência não encontrada.');
    if (transferencia.status !== 'ABERTA') throw new ConflictException('Só é possível cancelar transferências em aberto.');

    const depois = await this.prisma.transferencia.update({
      where: { id },
      data: { status: 'CANCELADA', canceladoPor: usuarioId, canceladoEm: new Date(), motivoCancelamento: motivo },
    });

    await this.auditoria.registrar({
      entidade: 'transferencia',
      entidadeId: id,
      acao: 'CANCELAR',
      antes: transferencia,
      depois,
      usuarioId,
      empresaId,
    });

    return depois;
  }
}
