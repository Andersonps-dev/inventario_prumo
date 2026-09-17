import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { EmpresaScopeGuard } from '../common/guards/empresa-scope.guard';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual, UsuarioAutenticado } from '../common/decorators/usuario-atual.decorator';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EscoposService } from './escopos.service';
import { EfetivacaoService } from './efetivacao.service';
import { ComprovanteService } from './comprovante.service';
import {
  AdicionarItensDto,
  AtualizarEscopoDto,
  CancelarContagensLoteDto,
  CriarEscopoDto,
  EfetivarEscopoDto,
  MotivoDto,
  RegistrarContagemDto,
} from './dto/escopo.dto';

@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Controller('escopos')
export class EscoposController {
  constructor(
    private readonly escoposService: EscoposService,
    private readonly efetivacaoService: EfetivacaoService,
    private readonly comprovanteService: ComprovanteService,
  ) {}

  @Get()
  listar(@Query('status') status: string | undefined, @EmpresaAtual() empresaId: number) {
    return this.escoposService.listar(status, empresaId);
  }

  @Get('notificacoes/prazo')
  notificacoesPrazo(@Query('dias') dias: string | undefined, @EmpresaAtual() empresaId: number) {
    return this.escoposService.notificacoesPrazo(empresaId, dias ? Number(dias) : undefined);
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number, @EmpresaAtual() empresaId: number) {
    return this.escoposService.buscarPorId(id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post()
  criar(@Body() dto: CriarEscopoDto, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.escoposService.criar(dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarEscopoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.escoposService.atualizar(id, dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Delete(':id')
  excluirRascunho(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.escoposService.excluirRascunho(id, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/abrir')
  abrir(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.escoposService.abrir(id, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/itens')
  adicionarItens(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdicionarItensDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.escoposService.adicionarItens(id, dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/itens/:itemId/cancelar')
  cancelarItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: MotivoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.escoposService.cancelarItem(id, itemId, dto.motivo, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/cancelar')
  cancelarEscopo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MotivoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.escoposService.cancelarEscopo(id, dto.motivo, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/encerrar-contagem')
  encerrarContagem(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.escoposService.encerrarContagem(id, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/reabrir')
  reabrir(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.escoposService.reabrir(id, usuario.id, empresaId);
  }

  @Post('contagens')
  registrarContagem(@Body() dto: RegistrarContagemDto, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.escoposService.registrarContagem(dto, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/contagens/:contagemId/cancelar')
  cancelarContagem(
    @Param('id', ParseIntPipe) id: number,
    @Param('contagemId', ParseIntPipe) contagemId: number,
    @Body() dto: MotivoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.escoposService.cancelarContagem(id, contagemId, dto.motivo, usuario.id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/contagens/cancelar-lote')
  cancelarContagensEmLote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarContagensLoteDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.escoposService.cancelarContagensEmLote(id, dto.contagemIds, dto.motivo, usuario.id, empresaId);
  }

  @Get(':id/conferencia')
  conferencia(@Param('id', ParseIntPipe) id: number, @EmpresaAtual() empresaId: number) {
    return this.efetivacaoService.conferencia(id, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post(':id/efetivar')
  efetivar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EfetivarEscopoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.efetivacaoService.efetivar(id, dto.politicaPendentes, usuario.id, empresaId);
  }

  @Get(':id/comprovante.pdf')
  comprovantePdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @EmpresaAtual() empresaId: number) {
    return this.comprovanteService.gerarPdf(id, res, empresaId);
  }

  @Get(':id/comprovante.xlsx')
  comprovanteXlsx(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @EmpresaAtual() empresaId: number) {
    return this.comprovanteService.gerarXlsx(id, res, empresaId);
  }
}
