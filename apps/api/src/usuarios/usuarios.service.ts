import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../common/auditoria/auditoria.service';
import { UsuarioAutenticado } from '../common/decorators/usuario-atual.decorator';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';

const SELECAO_PUBLICA = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  ativo: true,
  criadoEm: true,
  empresa: { select: { id: true, nome: true } },
} as const;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /** SUPER_ADMIN sem empresa selecionada vê todo mundo; qualquer outro caso é escopado. */
  listar(ator: UsuarioAutenticado, empresaId: number | null) {
    return this.prisma.usuario.findMany({
      where: empresaId ? { empresaId } : undefined,
      select: SELECAO_PUBLICA,
      orderBy: { nome: 'asc' },
    });
  }

  async criar(dto: CriarUsuarioDto, empresaId: number, usuarioIdAtor: number) {
    if ((dto.papel as string) === 'SUPER_ADMIN') {
      throw new BadRequestException('SUPER_ADMIN não é atribuído por aqui.');
    }

    const existente = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existente) throw new ConflictException('Já existe um usuário com este email.');

    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const usuario = await this.prisma.usuario.create({
      data: { nome: dto.nome, email: dto.email, senhaHash, papel: dto.papel, empresaId },
      select: SELECAO_PUBLICA,
    });

    await this.auditoria.registrar({
      entidade: 'usuario',
      entidadeId: usuario.id,
      acao: 'CRIAR',
      depois: usuario,
      usuarioId: usuarioIdAtor,
      empresaId,
    });

    return usuario;
  }

  async atualizar(id: number, dto: AtualizarUsuarioDto, ator: UsuarioAutenticado) {
    const antes = await this.prisma.usuario.findUnique({ where: { id }, select: SELECAO_PUBLICA });
    if (!antes) throw new NotFoundException('Usuário não encontrado.');
    if (ator.papel !== 'SUPER_ADMIN' && antes.empresa?.id !== ator.empresaId) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    if ((dto.papel as string) === 'SUPER_ADMIN') {
      throw new BadRequestException('SUPER_ADMIN não é atribuído por aqui.');
    }

    const depois = await this.prisma.usuario.update({
      where: { id },
      data: dto,
      select: SELECAO_PUBLICA,
    });

    await this.auditoria.registrar({
      entidade: 'usuario',
      entidadeId: id,
      acao: 'EDITAR',
      antes,
      depois,
      usuarioId: ator.id,
      empresaId: antes.empresa?.id ?? null,
    });

    return depois;
  }
}
