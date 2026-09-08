import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { EmpresaScopeGuard } from '../common/guards/empresa-scope.guard';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual, UsuarioAutenticado } from '../common/decorators/usuario-atual.decorator';
import { EmpresaAtual, EmpresaAtualOuNula } from '../common/decorators/empresa-atual.decorator';
import { UsuariosService } from './usuarios.service';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';

@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Papeis('ADMIN')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  listar(@UsuarioAtual() ator: UsuarioAutenticado, @EmpresaAtualOuNula() empresaId: number | null) {
    return this.usuariosService.listar(ator, empresaId);
  }

  @Post()
  criar(@Body() dto: CriarUsuarioDto, @EmpresaAtual() empresaId: number, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.usuariosService.criar(dto, empresaId, usuario.id);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarUsuarioDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.usuariosService.atualizar(id, dto, usuario);
  }
}
