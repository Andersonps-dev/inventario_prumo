import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email }, include: { empresa: true } });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    // SUPER_ADMIN não pertence a empresa nenhuma; todo outro papel precisa
    // da empresa dele ativa — inativar a empresa corta o acesso na hora.
    if (usuario.papel !== 'SUPER_ADMIN' && !usuario.empresa?.ativo) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      papel: usuario.papel,
      empresaId: usuario.empresaId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      usuario: payload,
    };
  }
}
