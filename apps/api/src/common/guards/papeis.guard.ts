import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Papel } from '@prisma/client';
import { PAPEIS_KEY } from '../decorators/papeis.decorator';

@Injectable()
export class PapeisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const papeisPermitidos = this.reflector.getAllAndOverride<Papel[] | undefined>(PAPEIS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!papeisPermitidos || papeisPermitidos.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Seu papel não permite esta ação.');
    if (user.papel === 'SUPER_ADMIN') return true;
    if (!papeisPermitidos.includes(user.papel)) {
      throw new ForbiddenException('Seu papel não permite esta ação.');
    }
    return true;
  }
}
