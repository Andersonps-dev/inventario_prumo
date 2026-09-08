import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../common/auditoria/auditoria.service';
import { CriarEmpresaDto, AtualizarEmpresaDto } from './dto/empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar() {
    return this.prisma.empresa.findMany({
      orderBy: { nome: 'asc' },
      include: {
        _count: { select: { usuarios: true, produtos: true, depositos: true, escopos: true } },
      },
    });
  }

  async criar(dto: CriarEmpresaDto, usuarioId: number) {
    const empresa = await this.prisma.empresa.create({ data: dto });
    await this.auditoria.registrar({
      entidade: 'empresa',
      entidadeId: empresa.id,
      acao: 'CRIAR',
      depois: empresa,
      usuarioId,
    });
    return empresa;
  }

  async atualizar(id: number, dto: AtualizarEmpresaDto, usuarioId: number) {
    const antes = await this.prisma.empresa.findUnique({ where: { id } });
    if (!antes) throw new NotFoundException('Empresa não encontrada.');

    const depois = await this.prisma.empresa.update({ where: { id }, data: dto });
    await this.auditoria.registrar({
      entidade: 'empresa',
      entidadeId: id,
      acao: 'EDITAR',
      antes,
      depois,
      usuarioId,
    });
    return depois;
  }
}
