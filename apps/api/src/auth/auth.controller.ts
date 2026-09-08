import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsuarioAtual, UsuarioAutenticado } from '../common/decorators/usuario-atual.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Bem mais apertado que o padrão global — login é o alvo natural de
  // força bruta, e o bcrypt já é caro por natureza (não queremos que uma
  // enxurrada de tentativas também derrube a API pra todo mundo).
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.senha);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return usuario;
  }
}
