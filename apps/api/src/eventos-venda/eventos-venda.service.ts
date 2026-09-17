import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DepositosService } from '../depositos/depositos.service';
import { EstoqueService } from '../estoque/estoque.service';
import { AuditoriaService } from '../common/auditoria/auditoria.service';
import { AdicionarItensEventoDto, AtualizarEventoVendaDto, CriarEventoVendaDto, ItemComPosicaoDto, RegistrarRetornoDto } from './dto/evento-venda.dto';

@Injectable()
export class EventosVendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly depositosService: DepositosService,
    private readonly estoqueService: EstoqueService,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(empresaId: number) {
    return this.prisma.eventoVenda.findMany({
      where: { empresaId },
      include: {
        depositoOrigem: { select: { nome: true } },
        criadoPorUsuario: { select: { nome: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async buscarPorId(id: number, empresaId: number) {
    const evento = await this.prisma.eventoVenda.findUnique({
      where: { id },
      include: {
        depositoOrigem: { select: { id: true, nome: true } },
        criadoPorUsuario: { select: { nome: true } },
        fechadoPorUsuario: { select: { nome: true } },
        reservas: {
          include: {
            produto: { select: { sku: true, nome: true, unidade: true, precoCusto: true } },
            endereco: { select: { codigo: true, interno: true } },
          },
        },
      },
    });
    if (!evento || evento.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');

    // Enquanto ABERTO, "o que ainda está no evento" é a própria lista de
    // reservas — o saldo nunca saiu de fato do depósito/endereço real.
    const { reservas, ...resto } = evento;
    const posicaoAtual =
      evento.status === 'ABERTO'
        ? reservas.map((r) => ({
            produto_id: r.produtoId,
            sku: r.produto.sku,
            nome: r.produto.nome,
            unidade: r.produto.unidade,
            endereco_id: r.enderecoId,
            posicao: r.endereco.codigo,
            endereco_interno: r.endereco.interno,
            saldo: Number(r.quantidade),
            valor_total: Number(r.quantidade) * Number(r.produto.precoCusto),
          }))
        : null;

    return { ...resto, posicaoAtual };
  }

  /** Edita título e/ou data da feira — não mexe em item nem em estoque, então vale pra feira aberta ou já fechada. */
  async atualizar(id: number, dto: AtualizarEventoVendaDto, usuarioId: number, empresaId: number) {
    const antes = await this.prisma.eventoVenda.findUnique({ where: { id } });
    if (!antes || antes.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');

    const depois = await this.prisma.eventoVenda.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        dataEvento: dto.dataEvento ? new Date(dto.dataEvento) : undefined,
      },
    });

    await this.auditoria.registrar({
      entidade: 'evento_venda',
      entidadeId: id,
      acao: 'EDITAR',
      antes,
      depois,
      usuarioId,
      empresaId,
    });

    return this.buscarPorId(id, empresaId);
  }

  /**
   * Abre um evento: o saldo NÃO sai do depósito real — cada item escolhido
   * vira uma reserva (produto+endereço+quantidade) contra o saldo já
   * existente ali. O mesmo depósito continua sendo usado pra tudo, sem
   * criar nenhum depósito novo por evento.
   */
  async criar(dto: CriarEventoVendaDto, usuarioId: number, empresaId: number) {
    const depositoOrigem = await this.depositosService.exigirAtivo(dto.depositoOrigemId, empresaId);
    await this.validarItens(dto.itens, depositoOrigem.id, empresaId);

    const evento = await this.prisma.$transaction(async (tx) => {
      const evento = await tx.eventoVenda.create({
        data: {
          empresaId,
          titulo: dto.titulo,
          dataEvento: dto.dataEvento ? new Date(dto.dataEvento) : undefined,
          depositoOrigemId: depositoOrigem.id,
          criadoPor: usuarioId,
        },
      });

      for (const item of dto.itens) {
        await this.reservar(tx, {
          empresaId,
          eventoVendaId: evento.id,
          produtoId: item.produtoId,
          depositoId: depositoOrigem.id,
          enderecoId: item.enderecoId,
          quantidade: item.quantidade,
        });
      }

      await this.auditoria.registrar(
        { entidade: 'evento_venda', entidadeId: evento.id, acao: 'CRIAR', depois: { ...evento, itens: dto.itens }, usuarioId, empresaId },
        tx,
      );

      return evento;
    });

    return this.buscarPorId(evento.id, empresaId);
  }

  /** Leva mais itens pra um evento já aberto — mesma lógica de `criar`, só reservando mais. */
  async adicionarItens(id: number, dto: AdicionarItensEventoDto, usuarioId: number, empresaId: number) {
    const evento = await this.prisma.eventoVenda.findUnique({ where: { id } });
    if (!evento || evento.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');
    if (evento.status !== 'ABERTO') throw new ConflictException('Este evento já está fechado.');

    await this.validarItens(dto.itens, evento.depositoOrigemId, empresaId);

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.itens) {
        await this.reservar(tx, {
          empresaId,
          eventoVendaId: evento.id,
          produtoId: item.produtoId,
          depositoId: evento.depositoOrigemId,
          enderecoId: item.enderecoId,
          quantidade: item.quantidade,
        });
      }

      await this.auditoria.registrar(
        { entidade: 'evento_venda', entidadeId: evento.id, acao: 'EDITAR', depois: { itensAdicionados: dto.itens }, usuarioId, empresaId },
        tx,
      );
    });

    return this.buscarPorId(id, empresaId);
  }

  /** Devolução de itens não vendidos: o saldo nunca tinha saído do lugar, então só reduz (ou apaga) a reserva daquele item. */
  async registrarRetorno(id: number, dto: RegistrarRetornoDto, usuarioId: number, empresaId: number) {
    const evento = await this.prisma.eventoVenda.findUnique({ where: { id } });
    if (!evento || evento.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');
    if (evento.status !== 'ABERTO') throw new ConflictException('Este evento já está fechado.');

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.itens) {
        const reserva = await tx.eventoVendaReserva.findUnique({
          where: { eventoVendaId_produtoId_enderecoId: { eventoVendaId: id, produtoId: item.produtoId, enderecoId: item.enderecoId } },
        });
        if (!reserva || Number(reserva.quantidade) < item.quantidade) {
          throw new BadRequestException(`Quantidade de retorno maior que a quantidade reservada pra este item no evento.`);
        }
        const restante = Number(reserva.quantidade) - item.quantidade;
        if (restante <= 0) {
          await tx.eventoVendaReserva.delete({ where: { id: reserva.id } });
        } else {
          await tx.eventoVendaReserva.update({ where: { id: reserva.id }, data: { quantidade: restante } });
        }
      }

      await this.auditoria.registrar(
        { entidade: 'evento_venda', entidadeId: evento.id, acao: 'EDITAR', depois: { retorno: dto.itens }, usuarioId, empresaId },
        tx,
      );
    });

    return this.buscarPorId(id, empresaId);
  }

  /**
   * Fecha o evento: o que ainda estiver reservado é o que foi vendido — nunca
   * voltou. Congela o relatório (preço no momento do fechamento, não o
   * atual), baixa de verdade (SAIDA) o saldo real na posição de origem, e
   * apaga as reservas do evento (resolvidas).
   */
  async fechar(id: number, usuarioId: number, empresaId: number) {
    const evento = await this.prisma.eventoVenda.findUnique({
      where: { id },
      include: { reservas: { include: { produto: { select: { sku: true, nome: true, unidade: true, precoCusto: true } } } } },
    });
    if (!evento || evento.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');
    if (evento.status !== 'ABERTO') throw new ConflictException('Este evento já está fechado.');

    const atualizado = await this.prisma.$transaction(async (tx) => {
      const itensVendidos = evento.reservas
        .filter((r) => Number(r.quantidade) > 0)
        .map((r) => {
          const quantidade = Number(r.quantidade);
          const precoCustoUnitario = Number(r.produto.precoCusto);
          return {
            produtoId: r.produtoId,
            sku: r.produto.sku,
            nome: r.produto.nome,
            unidade: r.produto.unidade,
            quantidade,
            precoCustoUnitario,
            valorTotal: quantidade * precoCustoUnitario,
          };
        });
      const relatorioFechamento = {
        itens: itensVendidos,
        quantidadeTotal: itensVendidos.reduce((acc, i) => acc + i.quantidade, 0),
        valorTotal: itensVendidos.reduce((acc, i) => acc + i.valorTotal, 0),
        fechadoEm: new Date().toISOString(),
      };

      for (const r of evento.reservas) {
        if (Number(r.quantidade) <= 0) continue;
        await this.estoqueService.registrarMovimento(
          {
            empresaId,
            produtoId: r.produtoId,
            depositoId: evento.depositoOrigemId,
            enderecoId: r.enderecoId,
            tipo: 'SAIDA',
            quantidade: -Number(r.quantidade),
            motivo: `Venda em evento: ${evento.titulo}`,
            origemTipo: 'EVENTO_VENDA',
            origemId: evento.id,
            usuarioId,
          },
          tx,
        );
      }

      await tx.eventoVendaReserva.deleteMany({ where: { eventoVendaId: id } });

      const depois = await tx.eventoVenda.update({
        where: { id },
        data: {
          status: 'FECHADO',
          relatorioFechamento,
          fechadoPor: usuarioId,
          fechadoEm: new Date(),
        },
      });

      await this.auditoria.registrar(
        { entidade: 'evento_venda', entidadeId: id, acao: 'EFETIVAR', antes: evento, depois, usuarioId, empresaId },
        tx,
      );

      return depois;
    });

    return this.buscarPorId(atualizado.id, empresaId);
  }

  /** Confere que cada produto e cada endereço apontado pelo cliente realmente pertence a esta empresa e a este depósito — nunca confia em IDs vindos de fora. */
  private async validarItens(itens: ItemComPosicaoDto[], depositoId: number, empresaId: number) {
    const produtoIds = [...new Set(itens.map((i) => i.produtoId))];
    const enderecoIds = [...new Set(itens.map((i) => i.enderecoId))];

    const [produtos, enderecos] = await Promise.all([
      this.prisma.produto.findMany({ where: { id: { in: produtoIds }, empresaId } }),
      this.prisma.endereco.findMany({ where: { id: { in: enderecoIds }, empresaId, depositoId } }),
    ]);
    if (produtos.length !== produtoIds.length) throw new BadRequestException('Um ou mais produtos não pertencem a esta empresa.');
    if (enderecos.length !== enderecoIds.length) {
      throw new BadRequestException('Um ou mais endereços não pertencem ao depósito de origem desta feira.');
    }
  }

  /**
   * Reserva `quantidade` de um (produto, endereço) real pro evento — soma à
   * reserva já existente desse evento nesse item, se houver. Trava a linha
   * de saldo (mesmo padrão do registrarMovimento) e confere que o saldo
   * livre (saldo - já reservado por QUALQUER evento aberto) comporta o
   * pedido, senão duas feiras poderiam reservar a mesma unidade física.
   */
  private async reservar(
    tx: Prisma.TransactionClient,
    params: { empresaId: number; eventoVendaId: number; produtoId: number; depositoId: number; enderecoId: number; quantidade: number },
  ) {
    const { empresaId, eventoVendaId, produtoId, depositoId, enderecoId, quantidade } = params;

    const linhasSaldo = await tx.$queryRaw<{ quantidade: Prisma.Decimal }[]>`
      SELECT quantidade FROM saldo_estoque
      WHERE produto_id = ${produtoId} AND deposito_id = ${depositoId} AND endereco_id = ${enderecoId} AND empresa_id = ${empresaId}
      FOR UPDATE
    `;
    const saldoAtual = Number(linhasSaldo[0]?.quantidade ?? 0);

    const reservasExistentes = await tx.eventoVendaReserva.aggregate({
      where: { produtoId, enderecoId, empresaId },
      _sum: { quantidade: true },
    });
    const jaReservado = Number(reservasExistentes._sum.quantidade ?? 0);
    const disponivel = saldoAtual - jaReservado;

    if (quantidade > disponivel) {
      throw new ConflictException(
        `Estoque insuficiente pra reservar: disponível ${disponivel} (saldo ${saldoAtual}, já reservado por outro(s) evento(s) ${jaReservado}).`,
      );
    }

    await tx.eventoVendaReserva.upsert({
      where: { eventoVendaId_produtoId_enderecoId: { eventoVendaId, produtoId, enderecoId } },
      create: { empresaId, eventoVendaId, produtoId, enderecoId, quantidade },
      update: { quantidade: { increment: quantidade } },
    });
  }
}
