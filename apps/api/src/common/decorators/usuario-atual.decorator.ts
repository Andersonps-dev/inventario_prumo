import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Papel } from '@prisma/client';

export interface UsuarioAutenticado {
  id: number;
  email: string;
  nome: string;
  papel: Papel;
  /** Nulo apenas para SUPER_ADMIN — todo outro papel pertence a uma empresa. */
  empresaId: number | null;
}

export const UsuarioAtual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
