import { Injectable } from '@nestjs/common';
import { AcaoAuditoria, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FiltrosAuditoriaDto } from './dto/filtros-auditoria.dto';

type ClientOuTransacao = PrismaService | Prisma.TransactionClient;
const TAMANHO_PAGINA = 50;

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  /** `empresaId` nulo só é aceito quando `podeVerTudo` (SUPER_ADMIN sem empresa selecionada). */
  async listar(filtros: FiltrosAuditoriaDto, empresaId: number | null, podeVerTudo: boolean) {
    const pagina = filtros.pagina ?? 1;
    const where: Prisma.AuditoriaWhereInput = {};

    // `filtros.empresaId` só é honrado sob `podeVerTudo` — a ordem antiga
    // aceitava esse filtro sempre que `empresaId` fosse nulo, sem checar
    // visão global, ficando correta hoje só por coincidência de como o
    // controller resolve o guard (ADMIN nunca chega aqui com empresaId nulo).
    if (empresaId) where.empresaId = empresaId;
    else if (podeVerTudo) {
      if (filtros.empresaId) where.empresaId = filtros.empresaId;
    } else where.empresaId = -1; // nunca casa — sem empresa selecionada e sem visão global, não vê nada

    if (filtros.entidade) where.entidade = filtros.entidade;
    if (filtros.acao) where.acao = filtros.acao as AcaoAuditoria;
    if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros.dataInicio || filtros.dataFim) {
      where.criadoEm = {
        gte: filtros.dataInicio ? new Date(filtros.dataInicio) : undefined,
        lte: filtros.dataFim ? new Date(filtros.dataFim) : undefined,
      };
    }

    const [itens, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        include: { usuario: { select: { nome: true } }, empresa: { select: { nome: true } } },
        orderBy: { criadoEm: 'desc' },
        take: TAMANHO_PAGINA,
        skip: (pagina - 1) * TAMANHO_PAGINA,
      }),
      this.prisma.auditoria.count({ where }),
    ]);

    return { itens, pagina, tamanhoPagina: TAMANHO_PAGINA, total };
  }

  async registrar(
    params: {
      entidade: string;
      entidadeId: number;
      acao: AcaoAuditoria;
      antes?: unknown;
      depois?: unknown;
      usuarioId: number;
      /** Nulo só em ações intrinsecamente cross-tenant do SUPER_ADMIN. */
      empresaId?: number | null;
    },
    client: ClientOuTransacao = this.prisma,
  ) {
    await client.auditoria.create({
      data: {
        entidade: params.entidade,
        entidadeId: params.entidadeId,
        acao: params.acao,
        antes: params.antes === undefined ? undefined : (params.antes as Prisma.InputJsonValue),
        depois: params.depois === undefined ? undefined : (params.depois as Prisma.InputJsonValue),
        usuarioId: params.usuarioId,
        empresaId: params.empresaId ?? undefined,
      },
    });
  }
}
