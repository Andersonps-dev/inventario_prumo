import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { EmpresaScopeGuard } from '../common/guards/empresa-scope.guard';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual, UsuarioAutenticado } from '../common/decorators/usuario-atual.decorator';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EntradasService } from './entradas.service';
import { BipagemEntradaDto, CriarEntradaDto, DistribuirEntradaDto, MotivoEntradaDto } from './dto/entrada.dto';

@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Controller('entradas')
export class EntradasController {
  constructor(private readonly entradasService: EntradasService) {}

  @Get()
  listar(@Query('status') status: string | undefined, @EmpresaAtual() empresaId: number) {
    return this.entradasService.listar(empresaId, status);
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number, @EmpresaAtual() empresaId: number) {
    return this.entradasService.buscarPorId(id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post()
  criar(@Body() dto: CriarEntradaDto, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.entradasService.criar(dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/itens')
  registrarBipagem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BipagemEntradaDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.entradasService.registrarBipagem(id, dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/finalizar')
  finalizar(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.entradasService.finalizar(id, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/distribuir')
  distribuir(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DistribuirEntradaDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.entradasService.distribuir(id, dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/cancelar')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MotivoEntradaDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.entradasService.cancelar(id, dto.motivo, usuario.id, empresaId);
  }
}
