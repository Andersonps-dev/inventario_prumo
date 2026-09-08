import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DepositosService } from '../depositos/depositos.service';
import { EnderecosService } from '../enderecos/enderecos.service';
import { EstoqueService } from '../estoque/estoque.service';
import { AuditoriaService } from '../common/auditoria/auditoria.service';
import { AdicionarItensEventoDto, CriarEventoVendaDto, ItemComPosicaoDto, RegistrarRetornoDto } from './dto/evento-venda.dto';

@Injectable()
export class EventosVendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly depositosService: DepositosService,
    private readonly enderecosService: EnderecosService,
    private readonly estoqueService: EstoqueService,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(empresaId: number) {
    return this.prisma.eventoVenda.findMany({
      where: { empresaId },
      include: {
        depositoOrigem: { select: { nome: true } },
        depositoVirtual: { select: { nome: true } },
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
        depositoVirtual: { select: { id: true, nome: true } },
        criadoPorUsuario: { select: { nome: true } },
        fechadoPorUsuario: { select: { nome: true } },
      },
    });
    if (!evento || evento.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');

    // Enquanto ABERTO, "o que ainda está na feira" é só a posição de estoque
    // atual do depósito virtual — não precisa de nenhum snapshot próprio.
    const posicaoAtual = evento.status === 'ABERTO' ? await this.estoqueService.posicaoEstoque(empresaId, evento.depositoVirtualId) : null;

    return { ...evento, posicaoAtual };
  }

  /**
   * Abre um evento: cria um depósito virtual dedicado (some das telas
   * operacionais quando o evento fecha, igual qualquer depósito inativado)
   * e transfere as quantidades escolhidas do depósito real pra ele. Cada
   * item já vem com o endereço de origem escolhido pelo usuário — o
   * estoque aqui é controlado por posição física, então quem está levando
   * pra feira sabe exatamente de qual prateleira tirou.
   */
  async criar(dto: CriarEventoVendaDto, usuarioId: number, empresaId: number) {
    const depositoOrigem = await this.depositosService.exigirAtivo(dto.depositoOrigemId, empresaId);
    await this.validarItens(dto.itens, depositoOrigem.id, empresaId);

    // Cria o depósito virtual fora da transação principal — mesmo padrão
    // já usado em DepositosService.criar (depósito + sentinela também não
    // são atômicos entre si). O título do evento pode se repetir (duas
    // feiras "PetLove 05/06" em datas diferentes, por exemplo) — o nome do
    // depósito (que não aparece em lugar nenhum da UI da feira) é que
    // precisa ser único, então desambigua com um sufixo numérico.
    const nomeVirtual = await this.nomeVirtualDisponivel(dto.titulo, empresaId);
    const depositoVirtual = await this.depositosService.criar({ nome: nomeVirtual }, empresaId);
    const sentinelaVirtual = await this.enderecosService.obterSentinela(depositoVirtual.id, empresaId);

    const evento = await this.prisma.$transaction(async (tx) => {
      const evento = await tx.eventoVenda.create({
        data: {
          empresaId,
          titulo: dto.titulo,
          depositoOrigemId: depositoOrigem.id,
          depositoVirtualId: depositoVirtual.id,
          criadoPor: usuarioId,
        },
      });

      for (const item of dto.itens) {
        await this.transferir(tx, {
          empresaId,
          usuarioId,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          depositoOrigemId: depositoOrigem.id,
          enderecoOrigemId: item.enderecoId,
          depositoDestinoId: depositoVirtual.id,
          enderecoDestinoId: sentinelaVirtual.id,
          eventoId: evento.id,
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

  /** Leva mais itens pra uma feira já aberta — mesma lógica de `criar`, sem recriar o depósito virtual. */
  async adicionarItens(id: number, dto: AdicionarItensEventoDto, usuarioId: number, empresaId: number) {
    const evento = await this.prisma.eventoVenda.findUnique({ where: { id } });
    if (!evento || evento.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');
    if (evento.status !== 'ABERTO') throw new ConflictException('Este evento já está fechado.');

    await this.validarItens(dto.itens, evento.depositoOrigemId, empresaId);
    const sentinelaVirtual = await this.enderecosService.obterSentinela(evento.depositoVirtualId, empresaId);

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.itens) {
        await this.transferir(tx, {
          empresaId,
          usuarioId,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          depositoOrigemId: evento.depositoOrigemId,
          enderecoOrigemId: item.enderecoId,
          depositoDestinoId: evento.depositoVirtualId,
          enderecoDestinoId: sentinelaVirtual.id,
          eventoId: evento.id,
        });
      }

      await this.auditoria.registrar(
        { entidade: 'evento_venda', entidadeId: evento.id, acao: 'EDITAR', depois: { itensAdicionados: dto.itens }, usuarioId, empresaId },
        tx,
      );
    });

    return this.buscarPorId(id, empresaId);
  }

  /** Devolução de itens não vendidos: sai do sentinela do depósito virtual, entra na posição de destino escolhida pelo usuário no depósito real de origem. */
  async registrarRetorno(id: number, dto: RegistrarRetornoDto, usuarioId: number, empresaId: number) {
    const evento = await this.prisma.eventoVenda.findUnique({ where: { id } });
    if (!evento || evento.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');
    if (evento.status !== 'ABERTO') throw new ConflictException('Este evento já está fechado.');

    // Os "enderecoId" do retorno são posições de destino no depósito de
    // origem (pra onde fisicamente volta), não do depósito virtual — mesma
    // validação de pertencimento usada em criar/adicionarItens.
    await this.validarItens(dto.itens, evento.depositoOrigemId, empresaId);
    const sentinelaVirtual = await this.enderecosService.obterSentinela(evento.depositoVirtualId, empresaId);

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.itens) {
        await this.transferir(tx, {
          empresaId,
          usuarioId,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          depositoOrigemId: evento.depositoVirtualId,
          enderecoOrigemId: sentinelaVirtual.id,
          depositoDestinoId: evento.depositoOrigemId,
          enderecoDestinoId: item.enderecoId,
          eventoId: evento.id,
        });
      }

      await this.auditoria.registrar(
        { entidade: 'evento_venda', entidadeId: evento.id, acao: 'EDITAR', depois: { retorno: dto.itens }, usuarioId, empresaId },
        tx,
      );
    });

    return this.buscarPorId(id, empresaId);
  }

  /**
   * Fecha o evento: o que sobrou no depósito virtual nunca voltou — foi
   * vendido. Congela o relatório (preço no momento do fechamento, não o
   * atual) e baixa o saldo restante do virtual, que deixa de existir como
   * estoque em qualquer lugar. Depósito virtual é inativado — a feira
   * acabou, não deve aparecer em telas de criar novo movimento/escopo.
   */
  async fechar(id: number, usuarioId: number, empresaId: number) {
    const evento = await this.prisma.eventoVenda.findUnique({ where: { id } });
    if (!evento || evento.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');
    if (evento.status !== 'ABERTO') throw new ConflictException('Este evento já está fechado.');

    const atualizado = await this.prisma.$transaction(async (tx) => {
      const saldos = await tx.saldoEstoque.findMany({
        where: { empresaId, depositoId: evento.depositoVirtualId, quantidade: { gt: 0 } },
        include: { produto: { select: { sku: true, nome: true, precoCusto: true, unidade: true } } },
      });

      const itensVendidos = saldos.map((s) => {
        const quantidade = Number(s.quantidade);
        const precoCustoUnitario = Number(s.produto.precoCusto);
        return {
          produtoId: s.produtoId,
          sku: s.produto.sku,
          nome: s.produto.nome,
          unidade: s.produto.unidade,
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

      for (const s of saldos) {
        await this.estoqueService.registrarMovimento(
          {
            empresaId,
            produtoId: s.produtoId,
            depositoId: evento.depositoVirtualId,
            enderecoId: s.enderecoId,
            tipo: 'SAIDA',
            quantidade: -Number(s.quantidade),
            motivo: `Venda em evento: ${evento.titulo}`,
            origemTipo: 'EVENTO_VENDA',
            origemId: evento.id,
            usuarioId,
          },
          tx,
        );
      }

      const depois = await tx.eventoVenda.update({
        where: { id },
        data: {
          status: 'FECHADO',
          relatorioFechamento,
          fechadoPor: usuarioId,
          fechadoEm: new Date(),
        },
      });

      await tx.deposito.update({ where: { id: evento.depositoVirtualId }, data: { ativo: false } });

      await this.auditoria.registrar(
        { entidade: 'evento_venda', entidadeId: id, acao: 'EFETIVAR', antes: evento, depois, usuarioId, empresaId },
        tx,
      );

      return depois;
    });

    return this.buscarPorId(atualizado.id, empresaId);
  }

  /** "Feira: <título>" — se já existir (mesmo título usado antes, ou colisão com um depósito comum), acrescenta "(2)", "(3)"... até achar um nome livre. */
  private async nomeVirtualDisponivel(titulo: string, empresaId: number): Promise<string> {
    const base = `Feira: ${titulo}`;
    let candidato = base;
    for (let sufixo = 2; await this.prisma.deposito.findUnique({ where: { empresaId_nome: { empresaId, nome: candidato } } }); sufixo++) {
      candidato = `${base} (${sufixo})`;
    }
    return candidato;
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

  /** TRANSFERENCIA entre dois pontos (depósito+endereço) exatos, escolhidos pelo usuário — uma SAIDA na origem, uma ENTRADA no destino. */
  private async transferir(
    tx: Prisma.TransactionClient,
    params: {
      empresaId: number;
      usuarioId: number;
      produtoId: number;
      quantidade: number;
      depositoOrigemId: number;
      enderecoOrigemId: number;
      depositoDestinoId: number;
      enderecoDestinoId: number;
      eventoId: number;
    },
  ) {
    await this.estoqueService.registrarMovimento(
      {
        empresaId: params.empresaId,
        produtoId: params.produtoId,
        depositoId: params.depositoOrigemId,
        enderecoId: params.enderecoOrigemId,
        tipo: 'TRANSFERENCIA',
        quantidade: -params.quantidade,
        origemTipo: 'EVENTO_VENDA',
        origemId: params.eventoId,
        usuarioId: params.usuarioId,
      },
      tx,
    );

    await this.estoqueService.registrarMovimento(
      {
        empresaId: params.empresaId,
        produtoId: params.produtoId,
        depositoId: params.depositoDestinoId,
        enderecoId: params.enderecoDestinoId,
        tipo: 'TRANSFERENCIA',
        quantidade: params.quantidade,
        origemTipo: 'EVENTO_VENDA',
        origemId: params.eventoId,
        usuarioId: params.usuarioId,
      },
      tx,
    );
  }
}
