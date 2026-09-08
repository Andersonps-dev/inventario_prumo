import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../common/auditoria/auditoria.service';
import { EscopoSelecaoService, ParProdutoEndereco } from './escopo-selecao.service';
import { validarTransicao, ESTADOS_ATIVOS } from './escopo-state-machine';
import {
  AdicionarItensDto,
  AtualizarEscopoDto,
  CriarEscopoDto,
  RegistrarContagemDto,
} from './dto/escopo.dto';

@Injectable()
export class EscoposService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly selecao: EscopoSelecaoService,
  ) {}

  private async gerarCodigo(empresaId: number): Promise<string> {
    const ano = new Date().getFullYear();
    const quantidade = await this.prisma.escopoInventario.count({
      where: { empresaId, codigo: { startsWith: `INV-${ano}-` } },
    });
    return `INV-${ano}-${String(quantidade + 1).padStart(4, '0')}`;
  }

  // Sem isso, um responsavelId de outra empresa (adivinhado ou vazado por
  // outra tela) seria aceito silenciosamente — o FK do Prisma não valida
  // empresa, só que o id existe em algum lugar do banco.
  private async exigirUsuarioDaEmpresa(usuarioId: number, empresaId: number) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId }, select: { empresaId: true } });
    if (!usuario || usuario.empresaId !== empresaId) throw new NotFoundException('Responsável não encontrado.');
  }

  async notificacoesPrazo(empresaId: number, diasLimite = 3) {
    const limite = new Date();
    limite.setDate(limite.getDate() + diasLimite);
    const hoje = new Date();

    return this.prisma.escopoInventario.findMany({
      where: {
        empresaId,
        status: { in: ESTADOS_ATIVOS },
        prazo: { not: null, lte: limite },
      },
      select: { id: true, codigo: true, titulo: true, status: true, prazo: true },
      orderBy: { prazo: 'asc' },
    }).then((escopos) =>
      escopos.map((e) => ({
        ...e,
        diasAtePrazo: e.prazo ? Math.ceil((e.prazo.getTime() - hoje.getTime()) / 86400000) : null,
      })),
    );
  }

  async listar(status: string | undefined, empresaId: number) {
    return this.prisma.escopoInventario.findMany({
      where: { empresaId, ...(status ? { status: status as never } : {}) },
      include: {
        deposito: { select: { nome: true } },
        responsavel: { select: { nome: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async buscarPorId(id: number, empresaId: number) {
    const escopo = await this.prisma.escopoInventario.findUnique({
      where: { id },
      include: {
        deposito: true,
        responsavel: { select: { id: true, nome: true } },
        itens: {
          include: {
            produto: { select: { id: true, sku: true, codigoBarras: true, nome: true, unidade: true, precoCusto: true } },
            endereco: { select: { id: true, codigo: true, interno: true } },
            contagens: { orderBy: { sequencia: 'desc' }, include: { contadoPorUsuario: { select: { nome: true } } } },
          },
        },
      },
    });
    if (!escopo || escopo.empresaId !== empresaId) throw new NotFoundException('Escopo de inventário não encontrado.');
    return escopo;
  }

  async criar(dto: CriarEscopoDto, usuarioId: number, empresaId: number) {
    const deposito = await this.prisma.deposito.findUnique({ where: { id: dto.depositoId } });
    if (!deposito || deposito.empresaId !== empresaId) throw new NotFoundException('Depósito não encontrado.');
    if (!deposito.ativo) throw new BadRequestException('Este depósito está inativo.');
    if (dto.responsavelId !== undefined) await this.exigirUsuarioDaEmpresa(dto.responsavelId, empresaId);

    const codigo = await this.gerarCodigo(empresaId);
    const escopo = await this.prisma.escopoInventario.create({
      data: {
        empresaId,
        codigo,
        titulo: dto.titulo,
        depositoId: dto.depositoId,
        responsavelId: dto.responsavelId,
        prazo: dto.prazo ? new Date(dto.prazo) : undefined,
        observacao: dto.observacao,
        criterioSelecao: dto.criterio as never,
        status: 'RASCUNHO',
      },
    });

    await this.auditoria.registrar({
      entidade: 'escopo_inventario',
      entidadeId: escopo.id,
      acao: 'CRIAR',
      depois: escopo,
      usuarioId,
      empresaId,
    });

    return escopo;
  }

  async atualizar(id: number, dto: AtualizarEscopoDto, usuarioId: number, empresaId: number) {
    const antes = await this.prisma.escopoInventario.findUnique({ where: { id } });
    if (!antes || antes.empresaId !== empresaId) throw new NotFoundException('Escopo de inventário não encontrado.');
    if (antes.status === 'EFETIVADO' || antes.status === 'CANCELADO') {
      throw new ConflictException('Escopo imutável neste status.');
    }
    if (dto.responsavelId !== undefined) await this.exigirUsuarioDaEmpresa(dto.responsavelId, empresaId);

    const depois = await this.prisma.escopoInventario.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        responsavelId: dto.responsavelId,
        prazo: dto.prazo ? new Date(dto.prazo) : undefined,
        observacao: dto.observacao,
      },
    });

    await this.auditoria.registrar({
      entidade: 'escopo_inventario',
      entidadeId: id,
      acao: 'EDITAR',
      antes,
      depois,
      usuarioId,
      empresaId,
    });

    return depois;
  }

  async excluirRascunho(id: number, usuarioId: number, empresaId: number) {
    const escopo = await this.prisma.escopoInventario.findUnique({ where: { id } });
    if (!escopo || escopo.empresaId !== empresaId) throw new NotFoundException('Escopo de inventário não encontrado.');
    if (escopo.status !== 'RASCUNHO') {
      throw new ConflictException('Só é possível excluir escopos em RASCUNHO.');
    }
    await this.prisma.escopoInventario.delete({ where: { id } });
    await this.auditoria.registrar({
      entidade: 'escopo_inventario',
      entidadeId: id,
      acao: 'CANCELAR',
      antes: escopo,
      usuarioId,
      empresaId,
    });
  }

  /** Congela o saldo de cada produto selecionado e transiciona RASCUNHO → ABERTO. */
  async abrir(id: number, usuarioId: number, empresaId: number) {
    const escopo = await this.prisma.escopoInventario.findUnique({ where: { id } });
    if (!escopo || escopo.empresaId !== empresaId) throw new NotFoundException('Escopo de inventário não encontrado.');
    validarTransicao(escopo.status, 'ABERTO');
    if (!escopo.criterioSelecao) throw new BadRequestException('Escopo sem critério de seleção definido.');

    const pares = await this.selecao.resolverItens(escopo.criterioSelecao as never, escopo.depositoId, empresaId);
    const { itensCriados, ignoradosPorConflito } = await this.criarItensCongelados(
      escopo.id,
      escopo.depositoId,
      pares,
      empresaId,
    );

    const atualizado = await this.prisma.escopoInventario.update({
      where: { id },
      data: { status: 'ABERTO', abertoPor: usuarioId, abertoEm: new Date() },
    });

    await this.auditoria.registrar({
      entidade: 'escopo_inventario',
      entidadeId: id,
      acao: 'EDITAR',
      antes: escopo,
      depois: { ...atualizado, itensCriados, ignoradosPorConflito },
      usuarioId,
      empresaId,
    });

    return { escopo: atualizado, itensCriados, ignoradosPorConflito };
  }

  /**
   * Regra 8.3 refinada: o que não pode se repetir é o par produto+endereço
   * num escopo ativo do mesmo depósito — duas equipes contando corredores
   * diferentes do mesmo produto, ao mesmo tempo, é legítimo.
   */
  private async criarItensCongelados(escopoId: number, depositoId: number, pares: ParProdutoEndereco[], empresaId: number) {
    if (pares.length === 0) return { itensCriados: 0, ignoradosPorConflito: 0, itens: [] };

    const chave = (p: ParProdutoEndereco) => `${p.produtoId}:${p.enderecoId}`;
    const produtoIds = [...new Set(pares.map((p) => p.produtoId))];

    const emOutroEscopoAtivo = await this.prisma.escopoItem.findMany({
      where: {
        empresaId,
        produtoId: { in: produtoIds },
        status: { not: 'CANCELADO' },
        escopo: { depositoId, status: { in: ESTADOS_ATIVOS }, id: { not: escopoId } },
      },
      select: { produtoId: true, enderecoId: true },
    });
    const bloqueados = new Set(emOutroEscopoAtivo.map(chave));

    const jaNoEscopo = new Set(
      (await this.prisma.escopoItem.findMany({ where: { escopoId }, select: { produtoId: true, enderecoId: true } })).map(
        chave,
      ),
    );

    const paresParaCriar = pares.filter((p) => !bloqueados.has(chave(p)) && !jaNoEscopo.has(chave(p)));
    const paresBloqueados = pares.filter((p) => bloqueados.has(chave(p))).length;

    if (paresParaCriar.length === 0) {
      return { itensCriados: 0, ignoradosPorConflito: paresBloqueados, itens: [] };
    }

    const saldos = await this.prisma.saldoEstoque.findMany({
      where: {
        empresaId,
        produtoId: { in: produtoIds },
        depositoId,
        enderecoId: { in: [...new Set(pares.map((p) => p.enderecoId))] },
      },
    });
    const saldoPorPar = new Map(saldos.map((s) => [`${s.produtoId}:${s.enderecoId}`, s.quantidade]));

    await this.prisma.escopoItem.createMany({
      data: paresParaCriar.map((p) => ({
        empresaId,
        escopoId,
        produtoId: p.produtoId,
        enderecoId: p.enderecoId,
        // Se não há linha de saldo_estoque para o par, o produto nunca foi
        // registrado ali — congela 0, e a diferença na contagem "sobe" o
        // saldo para lá quando o escopo for efetivado.
        saldoCongelado: saldoPorPar.get(chave(p)) ?? 0,
        status: 'PENDENTE' as const,
      })),
    });

    const itens = await this.prisma.escopoItem.findMany({
      where: { escopoId, OR: paresParaCriar.map((p) => ({ produtoId: p.produtoId, enderecoId: p.enderecoId })) },
      include: {
        produto: { select: { id: true, sku: true, codigoBarras: true, nome: true, unidade: true, precoCusto: true } },
        endereco: { select: { id: true, codigo: true, interno: true } },
        contagens: true,
      },
    });

    return { itensCriados: paresParaCriar.length, ignoradosPorConflito: paresBloqueados, itens };
  }

  /**
   * Adicionar itens a um escopo já ABERTO ou EM_CONTAGEM, de três formas:
   * - `enderecoIds`: puxa todo produto com saldo nesses endereços — mesma
   *   resolução do critério POR_ENDERECO usado na abertura, útil pra ampliar
   *   a área contada sem precisar cancelar e reabrir o escopo.
   * - `produtoIds` + `enderecoId`: força os produtos para esse endereço
   *   específico — caso do produto achado fisicamente ali durante a
   *   contagem, mas que o sistema ainda não associa a esse local.
   * - só `produtoIds`: seleção manual de produtos, cada um explodido pelos
   *   endereços onde já tem saldo neste depósito.
   */
  async adicionarItens(id: number, dto: AdicionarItensDto, usuarioId: number, empresaId: number) {
    const escopo = await this.prisma.escopoInventario.findUnique({ where: { id } });
    if (!escopo || escopo.empresaId !== empresaId) throw new NotFoundException('Escopo de inventário não encontrado.');
    if (!['ABERTO', 'EM_CONTAGEM'].includes(escopo.status)) {
      throw new ConflictException('Só é possível adicionar itens em escopos ABERTO ou EM_CONTAGEM.');
    }

    let pares: ParProdutoEndereco[];
    if (dto.enderecoIds && dto.enderecoIds.length > 0) {
      pares = await this.selecao.resolverItens(
        { tipo: 'POR_ENDERECO', enderecoIds: dto.enderecoIds },
        escopo.depositoId,
        empresaId,
      );
    } else if (dto.enderecoId) {
      const endereco = await this.prisma.endereco.findUnique({ where: { id: dto.enderecoId } });
      if (!endereco || endereco.empresaId !== empresaId || endereco.depositoId !== escopo.depositoId) {
        throw new BadRequestException('Endereço não pertence ao depósito deste escopo.');
      }
      if (!dto.produtoIds || dto.produtoIds.length === 0) {
        throw new BadRequestException('produtoIds é obrigatório junto de enderecoId.');
      }
      pares = dto.produtoIds.map((produtoId) => ({ produtoId, enderecoId: dto.enderecoId! }));
    } else {
      if (!dto.produtoIds || dto.produtoIds.length === 0) {
        throw new BadRequestException('Informe produtoIds ou enderecoIds.');
      }
      pares = await this.selecao.resolverItens(
        { tipo: 'SELECAO_MANUAL', produtoIds: dto.produtoIds },
        escopo.depositoId,
        empresaId,
      );
    }
    const resultado = await this.criarItensCongelados(escopo.id, escopo.depositoId, pares, empresaId);

    await this.auditoria.registrar({
      entidade: 'escopo_inventario',
      entidadeId: id,
      acao: 'EDITAR',
      depois: resultado,
      usuarioId,
      empresaId,
    });

    return resultado;
  }

  async cancelarItem(escopoId: number, itemId: number, motivo: string, usuarioId: number, empresaId: number) {
    const item = await this.prisma.escopoItem.findUnique({ where: { id: itemId } });
    if (!item || item.escopoId !== escopoId || item.empresaId !== empresaId) {
      throw new NotFoundException('Item do escopo não encontrado.');
    }

    const escopo = await this.prisma.escopoInventario.findUniqueOrThrow({ where: { id: escopoId } });
    if (!ESTADOS_ATIVOS.includes(escopo.status)) {
      throw new ConflictException('Escopo não permite alteração de itens neste status.');
    }
    if (escopo.status === 'EM_CONTAGEM' && !motivo) {
      throw new BadRequestException('Motivo é obrigatório para remover item durante a contagem.');
    }

    const antes = item;
    const depois = await this.prisma.escopoItem.update({
      where: { id: itemId },
      data: { status: 'CANCELADO' },
    });

    await this.auditoria.registrar({
      entidade: 'escopo_item',
      entidadeId: itemId,
      acao: 'CANCELAR',
      antes,
      depois: { ...depois, motivo },
      usuarioId,
      empresaId,
    });

    return depois;
  }

  async cancelarEscopo(id: number, motivo: string, usuarioId: number, empresaId: number) {
    const escopo = await this.prisma.escopoInventario.findUnique({ where: { id } });
    if (!escopo || escopo.empresaId !== empresaId) throw new NotFoundException('Escopo de inventário não encontrado.');
    validarTransicao(escopo.status, 'CANCELADO');

    const depois = await this.prisma.escopoInventario.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        canceladoPor: usuarioId,
        canceladoEm: new Date(),
        motivoCancelamento: motivo,
      },
    });

    await this.auditoria.registrar({
      entidade: 'escopo_inventario',
      entidadeId: id,
      acao: 'CANCELAR',
      antes: escopo,
      depois,
      usuarioId,
      empresaId,
    });

    return depois;
  }

  async encerrarContagem(id: number, usuarioId: number, empresaId: number) {
    const escopo = await this.prisma.escopoInventario.findUnique({ where: { id } });
    if (!escopo || escopo.empresaId !== empresaId) throw new NotFoundException('Escopo de inventário não encontrado.');
    validarTransicao(escopo.status, 'CONFERENCIA');

    const depois = await this.prisma.escopoInventario.update({
      where: { id },
      data: { status: 'CONFERENCIA' },
    });

    await this.auditoria.registrar({
      entidade: 'escopo_inventario',
      entidadeId: id,
      acao: 'EDITAR',
      antes: escopo,
      depois,
      usuarioId,
      empresaId,
    });

    return depois;
  }

  async reabrir(id: number, usuarioId: number, empresaId: number) {
    const escopo = await this.prisma.escopoInventario.findUnique({ where: { id } });
    if (!escopo || escopo.empresaId !== empresaId) throw new NotFoundException('Escopo de inventário não encontrado.');
    validarTransicao(escopo.status, 'EM_CONTAGEM');

    const depois = await this.prisma.escopoInventario.update({
      where: { id },
      data: { status: 'EM_CONTAGEM' },
    });

    await this.auditoria.registrar({
      entidade: 'escopo_inventario',
      entidadeId: id,
      acao: 'EDITAR',
      antes: escopo,
      depois,
      usuarioId,
      empresaId,
    });

    return depois;
  }

  async registrarContagem(dto: RegistrarContagemDto, usuarioId: number, empresaId: number) {
    const item = await this.prisma.escopoItem.findUnique({
      where: { id: dto.escopoItemId },
      include: { escopo: true, contagens: { orderBy: { sequencia: 'desc' }, take: 1 } },
    });
    if (!item || item.empresaId !== empresaId) throw new NotFoundException('Item do escopo não encontrado.');
    if (item.status === 'CANCELADO') throw new ConflictException('Item cancelado não aceita contagem.');
    if (!['ABERTO', 'EM_CONTAGEM'].includes(item.escopo.status)) {
      throw new ConflictException('Escopo não está aceitando contagens neste status.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Trava a linha do item — sem isso, duas requisições concorrentes pro
      // mesmo item (duas abas, ou o evento "online" disparando a
      // sincronização da fila offline duas vezes) leem a mesma última
      // contagem "ainda não substituída" antes de qualquer uma commitar, e
      // as duas criam sequência 1 como VALIDA. `item.contagens[0]` (lido
      // fora da transação, acima) fica só pra validação inicial — a decisão
      // de sequência/substituição usa a leitura fresca feita já com a trava.
      await tx.$executeRaw`SELECT id FROM escopo_item WHERE id = ${item.id} FOR UPDATE`;
      const ultimaContagem = await tx.contagem.findFirst({
        where: { escopoItemId: item.id },
        orderBy: { sequencia: 'desc' },
      });
      const ultimaSequencia = ultimaContagem?.sequencia ?? 0;

      if (ultimaContagem?.status === 'VALIDA') {
        await tx.contagem.update({
          where: { id: ultimaContagem.id },
          data: { status: 'SUBSTITUIDA' },
        });
      }

      const contagem = await tx.contagem.create({
        data: {
          empresaId,
          escopoItemId: item.id,
          sequencia: ultimaSequencia + 1,
          quantidade: dto.quantidade,
          observacao: dto.observacao,
          contadoPor: usuarioId,
        },
      });

      await tx.escopoItem.update({
        where: { id: item.id },
        data: {
          quantidadeFinal: dto.quantidade,
          diferenca: Number(dto.quantidade) - Number(item.saldoCongelado),
          status: 'CONTADO',
        },
      });

      if (item.escopo.status === 'ABERTO') {
        await tx.escopoInventario.update({ where: { id: item.escopo.id }, data: { status: 'EM_CONTAGEM' } });
      }

      await this.auditoria.registrar(
        {
          entidade: 'contagem',
          entidadeId: contagem.id,
          acao: 'CRIAR',
          depois: contagem,
          usuarioId,
          empresaId,
        },
        tx,
      );

      return contagem;
    });
  }

  async cancelarContagem(escopoId: number, contagemId: number, motivo: string, usuarioId: number, empresaId: number) {
    const contagem = await this.prisma.contagem.findUnique({
      where: { id: contagemId },
      include: { escopoItem: { include: { escopo: true } } },
    });
    if (!contagem || contagem.escopoItem.escopoId !== escopoId || contagem.empresaId !== empresaId) {
      throw new NotFoundException('Contagem não encontrada.');
    }
    if (contagem.status !== 'VALIDA') {
      throw new ConflictException('Só é possível cancelar a contagem válida vigente.');
    }
    if (!ESTADOS_ATIVOS.includes(contagem.escopoItem.escopo.status)) {
      throw new ConflictException('Escopo não permite alteração de contagens neste status.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.contagem.update({
        where: { id: contagemId },
        data: { status: 'CANCELADA', motivoCancelamento: motivo, canceladoPor: usuarioId, canceladoEm: new Date() },
      });

      const anterior = await tx.contagem.findFirst({
        where: { escopoItemId: contagem.escopoItemId, sequencia: contagem.sequencia - 1 },
      });

      if (anterior) {
        await tx.contagem.update({ where: { id: anterior.id }, data: { status: 'VALIDA' } });
        await tx.escopoItem.update({
          where: { id: contagem.escopoItemId },
          data: {
            quantidadeFinal: anterior.quantidade,
            diferenca: Number(anterior.quantidade) - Number(contagem.escopoItem.saldoCongelado),
            status: 'CONTADO',
          },
        });
      } else {
        await tx.escopoItem.update({
          where: { id: contagem.escopoItemId },
          data: { quantidadeFinal: null, diferenca: null, status: 'PENDENTE' },
        });
      }

      await this.auditoria.registrar(
        {
          entidade: 'contagem',
          entidadeId: contagemId,
          acao: 'CANCELAR',
          depois: { motivo },
          usuarioId,
          empresaId,
        },
        tx,
      );
    });
  }
}
