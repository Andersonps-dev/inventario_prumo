import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioAutenticado } from '../../common/decorators/usuario-atual.decorator';
import { obterJwtSecretObrigatorio } from '../jwt-secret.util';

interface JwtPayload {
  sub: number;
  email: string;
  nome: string;
  papel: UsuarioAutenticado['papel'];
  empresaId: number | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: obterJwtSecretObrigatorio(configService),
    });
  }

  // Revalida no banco a cada request (não só no login) — sem isso, inativar
  // um usuário ou uma empresa não corta o acesso de tokens já emitidos até
  // eles expirarem sozinhos (até 8h).
  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { empresa: true },
    });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Sessão inválida.');
    }
    if (usuario.papel !== 'SUPER_ADMIN' && !usuario.empresa?.ativo) {
      throw new UnauthorizedException('Sessão inválida.');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      papel: usuario.papel,
      empresaId: usuario.empresaId,
    };
  }
}
