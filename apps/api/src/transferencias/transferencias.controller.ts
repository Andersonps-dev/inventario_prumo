import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { EmpresaScopeGuard } from '../common/guards/empresa-scope.guard';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual, UsuarioAutenticado } from '../common/decorators/usuario-atual.decorator';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { TransferenciasService } from './transferencias.service';
import { BipagemTransferenciaDto, CriarTransferenciaDto, MotivoTransferenciaDto } from './dto/transferencia.dto';

@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Controller('transferencias')
export class TransferenciasController {
  constructor(private readonly transferenciasService: TransferenciasService) {}

  @Get()
  listar(@Query('status') status: string | undefined, @EmpresaAtual() empresaId: number) {
    return this.transferenciasService.listar(empresaId, status);
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number, @EmpresaAtual() empresaId: number) {
    return this.transferenciasService.buscarPorId(id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post()
  criar(@Body() dto: CriarTransferenciaDto, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.transferenciasService.criar(dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/itens')
  registrarBipagem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BipagemTransferenciaDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.transferenciasService.registrarBipagem(id, dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/efetivar')
  efetivar(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.transferenciasService.efetivar(id, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/cancelar')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MotivoTransferenciaDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.transferenciasService.cancelar(id, dto.motivo, usuario.id, empresaId);
  }
}
