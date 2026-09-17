import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DepositosService } from '../depositos/depositos.service';
import { EstoqueService } from '../estoque/estoque.service';
import { AuditoriaService } from '../common/auditoria/auditoria.service';
import { AdicionarPosicoesDto, AtualizarEventoVendaDto, CriarEventoVendaDto, ItemComPosicaoDto } from './dto/evento-venda.dto';

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
        posicoes: { include: { endereco: { select: { id: true, codigo: true, interno: true } } } },
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
    const { reservas, posicoes, ...resto } = evento;
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

    return {
      ...resto,
      posicoes: posicoes.map((p) => ({ enderecoId: p.endereco.id, codigo: p.endereco.codigo, interno: p.endereco.interno })),
      posicaoAtual,
    };
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
   * Abre um evento só com título/data/depósito/posições — sem itens ainda.
   * As posições viram `EventoVendaPosicao`, a lista de onde vai valer bipar
   * produto pra reservar. Itens entram depois, um bipe de cada vez, via
   * `adicionarItem`.
   */
  async criar(dto: CriarEventoVendaDto, usuarioId: number, empresaId: number) {
    const depositoOrigem = await this.depositosService.exigirAtivo(dto.depositoOrigemId, empresaId);
    await this.validarEnderecos(dto.enderecoIds, depositoOrigem.id, empresaId);

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

      await tx.eventoVendaPosicao.createMany({
        data: dto.enderecoIds.map((enderecoId) => ({ empresaId, eventoVendaId: evento.id, enderecoId })),
      });

      await this.auditoria.registrar(
        { entidade: 'evento_venda', entidadeId: evento.id, acao: 'CRIAR', depois: { ...evento, enderecoIds: dto.enderecoIds }, usuarioId, empresaId },
        tx,
      );

      return evento;
    });

    return this.buscarPorId(evento.id, empresaId);
  }

  /** Amplia as posições habilitadas de um grêmio já aberto — nunca remove, só soma. */
  async adicionarPosicoes(id: number, dto: AdicionarPosicoesDto, usuarioId: number, empresaId: number) {
    const evento = await this.prisma.eventoVenda.findUnique({ where: { id } });
    if (!evento || evento.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');
    if (evento.status !== 'ABERTO') throw new ConflictException('Este evento já está fechado.');

    await this.validarEnderecos(dto.enderecoIds, evento.depositoOrigemId, empresaId);

    await this.prisma.$transaction(async (tx) => {
      await tx.eventoVendaPosicao.createMany({
        data: dto.enderecoIds.map((enderecoId) => ({ empresaId, eventoVendaId: id, enderecoId })),
        skipDuplicates: true,
      });
      await this.auditoria.registrar(
        { entidade: 'evento_venda', entidadeId: id, acao: 'EDITAR', depois: { posicoesAdicionadas: dto.enderecoIds }, usuarioId, empresaId },
        tx,
      );
    });

    return this.buscarPorId(id, empresaId);
  }

  /** Bipa um produto pro grêmio: soma à reserva já existente desse (produto, endereço) — mesma lógica de "cada bipe soma" do inventário. */
  async adicionarItem(id: number, dto: ItemComPosicaoDto, usuarioId: number, empresaId: number) {
    const evento = await this.prisma.eventoVenda.findUnique({ where: { id } });
    if (!evento || evento.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');
    if (evento.status !== 'ABERTO') throw new ConflictException('Este evento já está fechado.');

    await this.validarItemNoEvento(id, dto, empresaId);

    await this.prisma.$transaction(async (tx) => {
      await this.reservar(tx, {
        empresaId,
        eventoVendaId: evento.id,
        produtoId: dto.produtoId,
        depositoId: evento.depositoOrigemId,
        enderecoId: dto.enderecoId,
        quantidade: dto.quantidade,
      });

      await this.auditoria.registrar(
        { entidade: 'evento_venda', entidadeId: evento.id, acao: 'EDITAR', depois: { itemAdicionado: dto }, usuarioId, empresaId },
        tx,
      );
    });

    return this.buscarPorId(id, empresaId);
  }

  /** Devolução de um item não vendido: o saldo nunca tinha saído do lugar, então só reduz (ou apaga) a reserva daquele item. */
  async registrarRetornoItem(id: number, dto: ItemComPosicaoDto, usuarioId: number, empresaId: number) {
    const evento = await this.prisma.eventoVenda.findUnique({ where: { id } });
    if (!evento || evento.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');
    if (evento.status !== 'ABERTO') throw new ConflictException('Este evento já está fechado.');

    await this.prisma.$transaction(async (tx) => {
      const reserva = await tx.eventoVendaReserva.findUnique({
        where: { eventoVendaId_produtoId_enderecoId: { eventoVendaId: id, produtoId: dto.produtoId, enderecoId: dto.enderecoId } },
      });
      if (!reserva || Number(reserva.quantidade) < dto.quantidade) {
        throw new BadRequestException('Quantidade de retorno maior que a quantidade reservada pra este item no evento.');
      }
      const restante = Number(reserva.quantidade) - dto.quantidade;
      if (restante <= 0) {
        await tx.eventoVendaReserva.delete({ where: { id: reserva.id } });
      } else {
        await tx.eventoVendaReserva.update({ where: { id: reserva.id }, data: { quantidade: restante } });
      }

      await this.auditoria.registrar(
        { entidade: 'evento_venda', entidadeId: evento.id, acao: 'EDITAR', depois: { retorno: dto }, usuarioId, empresaId },
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

  /** Confere que cada endereço apontado pelo cliente realmente pertence a esta empresa e a este depósito — nunca confia em IDs vindos de fora. */
  private async validarEnderecos(enderecoIds: number[], depositoId: number, empresaId: number) {
    const idsUnicos = [...new Set(enderecoIds)];
    const enderecos = await this.prisma.endereco.findMany({ where: { id: { in: idsUnicos }, empresaId, depositoId } });
    if (enderecos.length !== idsUnicos.length) {
      throw new BadRequestException('Um ou mais endereços não pertencem ao depósito de origem deste grêmio.');
    }
  }

  /** Confere que o produto existe nesta empresa e que o endereço bipado é uma das posições habilitadas deste grêmio. */
  private async validarItemNoEvento(eventoVendaId: number, item: ItemComPosicaoDto, empresaId: number) {
    const [produto, posicao] = await Promise.all([
      this.prisma.produto.findUnique({ where: { id: item.produtoId } }),
      this.prisma.eventoVendaPosicao.findUnique({
        where: { eventoVendaId_enderecoId: { eventoVendaId, enderecoId: item.enderecoId } },
      }),
    ]);
    if (!produto || produto.empresaId !== empresaId) throw new BadRequestException('Produto não pertence a esta empresa.');
    if (!posicao) {
      throw new BadRequestException('Este endereço não é uma posição habilitada deste grêmio — adicione a posição primeiro.');
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
