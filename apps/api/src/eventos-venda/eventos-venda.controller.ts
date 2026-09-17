import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { EmpresaScopeGuard } from '../common/guards/empresa-scope.guard';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual, UsuarioAutenticado } from '../common/decorators/usuario-atual.decorator';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EventosVendaService } from './eventos-venda.service';
import { AdicionarPosicoesDto, AtualizarEventoVendaDto, CriarEventoVendaDto, ItemComPosicaoDto } from './dto/evento-venda.dto';

@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Controller('eventos-venda')
export class EventosVendaController {
  constructor(private readonly eventosVendaService: EventosVendaService) {}

  @Get()
  listar(@EmpresaAtual() empresaId: number) {
    return this.eventosVendaService.listar(empresaId);
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number, @EmpresaAtual() empresaId: number) {
    return this.eventosVendaService.buscarPorId(id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post()
  criar(@Body() dto: CriarEventoVendaDto, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.eventosVendaService.criar(dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarEventoVendaDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.eventosVendaService.atualizar(id, dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/posicoes')
  adicionarPosicoes(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdicionarPosicoesDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.eventosVendaService.adicionarPosicoes(id, dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/itens')
  adicionarItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ItemComPosicaoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.eventosVendaService.adicionarItem(id, dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/retorno')
  registrarRetornoItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ItemComPosicaoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.eventosVendaService.registrarRetornoItem(id, dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/fechar')
  fechar(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.eventosVendaService.fechar(id, usuario.id, empresaId);
  }
}
