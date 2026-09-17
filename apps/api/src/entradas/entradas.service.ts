import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DepositosService } from '../depositos/depositos.service';
import { EstoqueService } from '../estoque/estoque.service';
import { AuditoriaService } from '../common/auditoria/auditoria.service';
import { BipagemEntradaDto, CriarEntradaDto, DistribuirEntradaDto } from './dto/entrada.dto';

@Injectable()
export class EntradasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly depositosService: DepositosService,
    private readonly estoqueService: EstoqueService,
    private readonly auditoria: AuditoriaService,
  ) {}

  private async gerarCodigo(empresaId: number): Promise<string> {
    const ano = new Date().getFullYear();
    const quantidade = await this.prisma.entrada.count({
      where: { empresaId, codigo: { startsWith: `ENT-${ano}-` } },
    });
    return `ENT-${ano}-${String(quantidade + 1).padStart(4, '0')}`;
  }

  listar(empresaId: number, status?: string) {
    return this.prisma.entrada.findMany({
      where: { empresaId, ...(status ? { status: status as never } : {}) },
      include: {
        deposito: { select: { nome: true } },
        criadoPorUsuario: { select: { nome: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async buscarPorId(id: number, empresaId: number) {
    const entrada = await this.prisma.entrada.findUnique({
      where: { id },
      include: {
        deposito: { select: { id: true, nome: true } },
        criadoPorUsuario: { select: { nome: true } },
        canceladoPorUsuario: { select: { nome: true } },
        itens: {
          include: { produto: { select: { id: true, sku: true, codigoBarras: true, nome: true, unidade: true, precoCusto: true } } },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!entrada || entrada.empresaId !== empresaId) throw new NotFoundException('Entrada não encontrada.');
    return entrada;
  }

  async criar(dto: CriarEntradaDto, usuarioId: number, empresaId: number) {
    const deposito = await this.depositosService.exigirAtivo(dto.depositoId, empresaId);

    const codigo = await this.gerarCodigo(empresaId);
    const entrada = await this.prisma.entrada.create({
      data: { empresaId, codigo, nota: dto.nota, depositoId: deposito.id, criadoPor: usuarioId },
    });

    await this.auditoria.registrar({
      entidade: 'entrada',
      entidadeId: entrada.id,
      acao: 'CRIAR',
      depois: entrada,
      usuarioId,
      empresaId,
    });

    return this.buscarPorId(entrada.id, empresaId);
  }

  /** Bipa um produto recebido — sem checar saldo, é mercadoria nova chegando, ainda não existe no sistema. */
  async registrarBipagem(id: number, dto: BipagemEntradaDto, usuarioId: number, empresaId: number) {
    const entrada = await this.prisma.entrada.findUnique({ where: { id } });
    if (!entrada || entrada.empresaId !== empresaId) throw new NotFoundException('Entrada não encontrada.');
    if (entrada.status !== 'RASCUNHO') {
      throw new ConflictException('Só é possível bipar produtos enquanto a entrada está em rascunho.');
    }

    const produto = await this.prisma.produto.findUnique({ where: { id: dto.produtoId } });
    if (!produto || produto.empresaId !== empresaId) throw new BadRequestException('Produto não pertence a esta empresa.');

    await this.prisma.$transaction(async (tx) => {
      await tx.entradaItem.upsert({
        where: { entradaId_produtoId: { entradaId: id, produtoId: dto.produtoId } },
        create: { empresaId, entradaId: id, produtoId: dto.produtoId, quantidadeRecebida: dto.quantidade },
        update: { quantidadeRecebida: { increment: dto.quantidade } },
      });

      await this.auditoria.registrar(
        { entidade: 'entrada', entidadeId: id, acao: 'EDITAR', depois: { itemBipado: dto }, usuarioId, empresaId },
        tx,
      );
    });

    return this.buscarPorId(id, empresaId);
  }

  /** RASCUNHO -> EM_DISTRIBUICAO: trava a lista do que foi recebido, só resta distribuir pras posições. */
  async finalizar(id: number, usuarioId: number, empresaId: number) {
    const entrada = await this.prisma.entrada.findUnique({ where: { id }, include: { itens: true } });
    if (!entrada || entrada.empresaId !== empresaId) throw new NotFoundException('Entrada não encontrada.');
    if (entrada.status !== 'RASCUNHO') throw new ConflictException('Esta entrada já foi finalizada.');
    if (entrada.itens.length === 0) throw new BadRequestException('Bipe ao menos um produto antes de finalizar.');

    const depois = await this.prisma.entrada.update({
      where: { id },
      data: { status: 'EM_DISTRIBUICAO', finalizadoEm: new Date() },
    });

    await this.auditoria.registrar({
      entidade: 'entrada',
      entidadeId: id,
      acao: 'EDITAR',
      antes: entrada,
      depois,
      usuarioId,
      empresaId,
    });

    return this.buscarPorId(id, empresaId);
  }

  /**
   * Distribui vários produtos de uma vez pra uma posição — um `registrarMovimento`
   * ENTRADA real por item. Fecha sozinha como CONCLUIDA quando `quantidadeDistribuida`
   * bater com `quantidadeRecebida` em todo item; senão continua EM_DISTRIBUICAO e a
   * tela pode ser reaberta depois pra terminar.
   */
  async distribuir(id: number, dto: DistribuirEntradaDto, usuarioId: number, empresaId: number) {
    const entrada = await this.prisma.entrada.findUnique({
      where: { id },
      include: { itens: { include: { produto: { select: { sku: true } } } } },
    });
    if (!entrada || entrada.empresaId !== empresaId) throw new NotFoundException('Entrada não encontrada.');
    if (entrada.status !== 'EM_DISTRIBUICAO') throw new ConflictException('Esta entrada não está em distribuição.');

    const endereco = await this.prisma.endereco.findUnique({ where: { id: dto.enderecoId } });
    if (!endereco || endereco.empresaId !== empresaId || endereco.depositoId !== entrada.depositoId) {
      throw new BadRequestException('Posição não pertence ao depósito desta entrada.');
    }

    const atualizada = await this.prisma.$transaction(async (tx) => {
      for (const itemDto of dto.itens) {
        const item = entrada.itens.find((i) => i.produtoId === itemDto.produtoId);
        if (!item) throw new BadRequestException(`Produto ${itemDto.produtoId} não faz parte desta entrada.`);

        const restante = Number(item.quantidadeRecebida) - Number(item.quantidadeDistribuida);
        if (itemDto.quantidade > restante) {
          throw new BadRequestException(
            `Quantidade a distribuir do produto ${item.produto.sku} (${itemDto.quantidade}) maior que o restante (${restante}).`,
          );
        }

        await this.estoqueService.registrarMovimento(
          {
            empresaId,
            produtoId: item.produtoId,
            depositoId: entrada.depositoId,
            enderecoId: dto.enderecoId,
            tipo: 'ENTRADA',
            quantidade: itemDto.quantidade,
            origemTipo: 'ENTRADA_ITEM',
            origemId: item.id,
            motivo: `Entrada ${entrada.codigo} (NF ${entrada.nota})`,
            usuarioId,
          },
          tx,
        );

        await tx.entradaItem.update({
          where: { id: item.id },
          data: { quantidadeDistribuida: { increment: itemDto.quantidade } },
        });
      }

      const itensAtualizados = await tx.entradaItem.findMany({ where: { entradaId: id } });
      const tudoDistribuido = itensAtualizados.every((i) => Number(i.quantidadeDistribuida) >= Number(i.quantidadeRecebida));

      const depois = tudoDistribuido
        ? await tx.entrada.update({ where: { id }, data: { status: 'CONCLUIDA', concluidoEm: new Date() } })
        : entrada;

      await this.auditoria.registrar(
        { entidade: 'entrada', entidadeId: id, acao: 'EDITAR', depois: { distribuicao: dto }, usuarioId, empresaId },
        tx,
      );

      return depois;
    });

    return this.buscarPorId(atualizada.id, empresaId);
  }

  /** Só cancela enquanto RASCUNHO — depois de finalizada, parte já pode ter virado movimento real de estoque. */
  async cancelar(id: number, motivo: string, usuarioId: number, empresaId: number) {
    const entrada = await this.prisma.entrada.findUnique({ where: { id } });
    if (!entrada || entrada.empresaId !== empresaId) throw new NotFoundException('Entrada não encontrada.');
    if (entrada.status !== 'RASCUNHO') {
      throw new ConflictException('Só é possível cancelar entradas em rascunho.');
    }

    const depois = await this.prisma.entrada.update({
      where: { id },
      data: { status: 'CANCELADA', canceladoPor: usuarioId, canceladoEm: new Date(), motivoCancelamento: motivo },
    });

    await this.auditoria.registrar({
      entidade: 'entrada',
      entidadeId: id,
      acao: 'CANCELAR',
      antes: entrada,
      depois,
      usuarioId,
      empresaId,
    });

    return depois;
  }
}
