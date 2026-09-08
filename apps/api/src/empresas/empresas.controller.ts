import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual, UsuarioAutenticado } from '../common/decorators/usuario-atual.decorator';
import { EmpresasService } from './empresas.service';
import { CriarEmpresaDto, AtualizarEmpresaDto } from './dto/empresa.dto';

@UseGuards(JwtAuthGuard, PapeisGuard)
@Papeis('SUPER_ADMIN')
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get()
  listar() {
    return this.empresasService.listar();
  }

  @Post()
  criar(@Body() dto: CriarEmpresaDto, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.empresasService.criar(dto, usuario.id);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarEmpresaDto, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.empresasService.atualizar(id, dto, usuario.id);
  }
}
