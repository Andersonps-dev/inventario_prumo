import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioAutenticado } from '../decorators/usuario-atual.decorator';

/**
 * Resolve `request.empresaId` pra uso do decorator `@EmpresaAtual()`.
 * Precisa rodar depois do `JwtAuthGuard` (que popula `request.user`) —
 * sempre em `@UseGuards(JwtAuthGuard, EmpresaScopeGuard, ...)`, nessa ordem.
 *
 * Usuário comum: `empresaId` é sempre a própria, nunca a de outra —
 * qualquer tentativa de forçar `X-Empresa-Id` diferente é 403, nunca
 * silenciosamente ignorada. SUPER_ADMIN: sem o header, opera fora de
 * qualquer empresa (`null` — rotas cross-tenant como CRUD de empresas);
 * com o header, "entra" na empresa informada pra depurar/corrigir algo.
 */
@Injectable()
export class EmpresaScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const usuario = request.user as UsuarioAutenticado | undefined;
    if (!usuario) {
      request.empresaId = null;
      return true;
    }

    const headerEmpresaId = request.headers['x-empresa-id'];

    if (usuario.papel !== 'SUPER_ADMIN') {
      if (headerEmpresaId && Number(headerEmpresaId) !== usuario.empresaId) {
        throw new ForbiddenException('Você não pode operar em outra empresa.');
      }
      request.empresaId = usuario.empresaId;
      return true;
    }

    if (!headerEmpresaId) {
      request.empresaId = null;
      return true;
    }

    const empresa = await this.prisma.empresa.findUnique({ where: { id: Number(headerEmpresaId) } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada.');
    request.empresaId = empresa.id;
    return true;
  }
}
