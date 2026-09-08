import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../common/auditoria/auditoria.service';
import { gerarSequencia } from './gerador-sequencia';
import { AtualizarEnderecoDto, CriarEnderecoDto, GerarFaixaDto, ListarEnderecosQueryDto } from './dto/endereco.dto';

const LIMITE_LOTE = 5000;

interface Combinacao {
  setor: string;
  rua: string;
  modulo: string;
  nivel: string;
  vao: string;
  codigo: string;
}

function montarCodigo(c: Pick<Combinacao, 'setor' | 'rua' | 'modulo' | 'nivel' | 'vao'>): string {
  return `${c.setor}-${c.rua}-${c.modulo}-${c.nivel}-${c.vao}`;
}

@Injectable()
export class EnderecosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /** Cria o endereço-sentinela de um depósito novo (mesmo papel do backfill da migração). */
  async criarSentinela(depositoId: number, empresaId: number) {
    return this.prisma.endereco.create({
      data: {
        codigo: `SEM-ENDERECO-${depositoId}`,
        empresaId,
        depositoId,
        setor: 'SEM',
        rua: '0',
        modulo: '0',
        nivel: '0',
        vao: '0',
        interno: true,
      },
    });
  }

  async obterSentinela(depositoId: number, empresaId: number) {
    const sentinela = await this.prisma.endereco.findFirst({ where: { depositoId, empresaId, interno: true } });
    if (!sentinela) throw new NotFoundException('Depósito sem endereço-sentinela configurado.');
    return sentinela;
  }

  listar(filtros: ListarEnderecosQueryDto, empresaId: number) {
    return this.prisma.endereco.findMany({
      where: {
        empresaId,
        interno: false,
        depositoId: filtros.depositoId,
        ativo: filtros.ativo,
        ...(filtros.busca ? { codigo: { contains: filtros.busca, mode: 'insensitive' as const } } : {}),
      },
      include: { deposito: { select: { nome: true } } },
      orderBy: [{ setor: 'asc' }, { rua: 'asc' }, { modulo: 'asc' }, { nivel: 'asc' }, { vao: 'asc' }],
    });
  }

  async criar(dto: CriarEnderecoDto, usuarioId: number, empresaId: number) {
    const deposito = await this.prisma.deposito.findUnique({ where: { id: dto.depositoId } });
    if (!deposito || deposito.empresaId !== empresaId) throw new NotFoundException('Depósito não encontrado.');

    const codigo = montarCodigo(dto);
    const existente = await this.prisma.endereco.findUnique({ where: { empresaId_codigo: { empresaId, codigo } } });
    if (existente) throw new ConflictException(`Endereço "${codigo}" já existe.`);

    const endereco = await this.prisma.endereco.create({ data: { ...dto, codigo, empresaId } });
    await this.auditoria.registrar({
      entidade: 'endereco',
      entidadeId: endereco.id,
      acao: 'CRIAR',
      depois: endereco,
      usuarioId,
      empresaId,
    });
    return endereco;
  }

  async atualizar(id: number, dto: AtualizarEnderecoDto, usuarioId: number, empresaId: number) {
    const antes = await this.prisma.endereco.findUnique({ where: { id } });
    if (!antes || antes.empresaId !== empresaId) throw new NotFoundException('Endereço não encontrado.');
    if (antes.interno) throw new ConflictException('Endereço interno (sem local definido) não pode ser editado.');

    const proposto = {
      setor: dto.setor ?? antes.setor,
      rua: dto.rua ?? antes.rua,
      modulo: dto.modulo ?? antes.modulo,
      nivel: dto.nivel ?? antes.nivel,
      vao: dto.vao ?? antes.vao,
    };
    const codigo = montarCodigo(proposto);
    if (codigo !== antes.codigo) {
      const existente = await this.prisma.endereco.findUnique({ where: { empresaId_codigo: { empresaId, codigo } } });
      if (existente) throw new ConflictException(`Endereço "${codigo}" já existe.`);
    }

    const depois = await this.prisma.endereco.update({
      where: { id },
      data: { ...proposto, codigo, ativo: dto.ativo ?? antes.ativo },
    });
    await this.auditoria.registrar({
      entidade: 'endereco',
      entidadeId: id,
      acao: 'EDITAR',
      antes,
      depois,
      usuarioId,
      empresaId,
    });
    return depois;
  }

  async excluir(id: number, usuarioId: number, empresaId: number) {
    const endereco = await this.prisma.endereco.findUnique({ where: { id } });
    if (!endereco || endereco.empresaId !== empresaId) throw new NotFoundException('Endereço não encontrado.');
    if (endereco.interno) throw new ConflictException('Endereço interno (sem local definido) não pode ser excluído.');

    const [saldos, movimentos, itens] = await Promise.all([
      this.prisma.saldoEstoque.count({ where: { enderecoId: id } }),
      this.prisma.movimentoEstoque.count({ where: { enderecoId: id } }),
      this.prisma.escopoItem.count({ where: { enderecoId: id } }),
    ]);
    if (saldos + movimentos + itens > 0) {
      throw new ConflictException(
        'Não é possível excluir: este endereço já tem saldo, movimento ou contagem vinculados. Inative em vez de excluir.',
      );
    }

    await this.prisma.endereco.delete({ where: { id } });
    await this.auditoria.registrar({
      entidade: 'endereco',
      entidadeId: id,
      acao: 'EXCLUIR',
      antes: endereco,
      usuarioId,
      empresaId,
    });
  }

  // ─────────────── Geração por faixa (matriz) ───────────────

  private async calcularCombinacoes(dto: GerarFaixaDto, empresaId: number) {
    const deposito = await this.prisma.deposito.findUnique({ where: { id: dto.depositoId } });
    if (!deposito || deposito.empresaId !== empresaId) throw new NotFoundException('Depósito não encontrado.');

    const segmentos = {
      setor: gerarSequencia(dto.setor),
      rua: gerarSequencia(dto.rua),
      modulo: gerarSequencia(dto.modulo),
      nivel: gerarSequencia(dto.nivel),
      vao: gerarSequencia(dto.vao),
    };
    const total = Object.values(segmentos).reduce((acc, arr) => acc * arr.length, 1);
    if (total === 0) throw new BadRequestException('Faixa vazia — confira os segmentos.');
    if (total > LIMITE_LOTE) {
      throw new BadRequestException(`Essa combinação geraria ${total} endereços — o limite por lote é ${LIMITE_LOTE}. Reduza a faixa.`);
    }

    const combinacoes: Combinacao[] = [];
    for (const setor of segmentos.setor) {
      for (const rua of segmentos.rua) {
        for (const modulo of segmentos.modulo) {
          for (const nivel of segmentos.nivel) {
            for (const vao of segmentos.vao) {
              combinacoes.push({ setor, rua, modulo, nivel, vao, codigo: montarCodigo({ setor, rua, modulo, nivel, vao }) });
            }
          }
        }
      }
    }

    const codigosExistentes = new Set(
      (
        await this.prisma.endereco.findMany({
          where: { empresaId, codigo: { in: combinacoes.map((c) => c.codigo) } },
          select: { codigo: true },
        })
      ).map((e) => e.codigo),
    );

    const novos = combinacoes.filter((c) => !codigosExistentes.has(c.codigo));
    return { novos, duplicados: combinacoes.length - novos.length, total: combinacoes.length };
  }

  async gerarPrevia(dto: GerarFaixaDto, empresaId: number) {
    const { novos, duplicados, total } = await this.calcularCombinacoes(dto, empresaId);
    return {
      total,
      novos: novos.length,
      duplicados,
      amostra: novos.slice(0, 20).map((c) => c.codigo),
    };
  }

  async gerarConfirmar(dto: GerarFaixaDto, usuarioId: number, empresaId: number) {
    const { novos } = await this.calcularCombinacoes(dto, empresaId);
    if (novos.length === 0) {
      throw new ConflictException('Nenhum endereço novo para criar — todos os códigos dessa faixa já existem.');
    }

    await this.prisma.endereco.createMany({
      data: novos.map((c) => ({
        codigo: c.codigo,
        empresaId,
        depositoId: dto.depositoId,
        setor: c.setor,
        rua: c.rua,
        modulo: c.modulo,
        nivel: c.nivel,
        vao: c.vao,
      })),
    });

    const criados = await this.prisma.endereco.findMany({
      where: { empresaId, codigo: { in: novos.map((c) => c.codigo) } },
      orderBy: { codigo: 'asc' },
    });

    await this.auditoria.registrar({
      entidade: 'endereco',
      entidadeId: 0,
      acao: 'CRIAR',
      depois: { gerarFaixa: true, quantidade: criados.length },
      usuarioId,
      empresaId,
    });

    return { criados: criados.length, enderecos: criados };
  }
}
