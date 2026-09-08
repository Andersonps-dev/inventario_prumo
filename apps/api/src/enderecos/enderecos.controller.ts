import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { EmpresaScopeGuard } from '../common/guards/empresa-scope.guard';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual, UsuarioAutenticado } from '../common/decorators/usuario-atual.decorator';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EnderecosService } from './enderecos.service';
import { AtualizarEnderecoDto, CriarEnderecoDto, GerarFaixaDto, ListarEnderecosQueryDto } from './dto/endereco.dto';

@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Controller('enderecos')
export class EnderecosController {
  constructor(private readonly enderecosService: EnderecosService) {}

  @Get()
  listar(@Query() filtros: ListarEnderecosQueryDto, @EmpresaAtual() empresaId: number) {
    return this.enderecosService.listar(filtros, empresaId);
  }

  @Papeis('ADMIN', 'SUPERVISOR')
  @Post()
  criar(@Body() dto: CriarEnderecoDto, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.enderecosService.criar(dto, usuario.id, empresaId);
  }

  @Papeis('ADMIN', 'SUPERVISOR')
  @Post('gerar-faixa/previa')
  gerarPrevia(@Body() dto: GerarFaixaDto, @EmpresaAtual() empresaId: number) {
    return this.enderecosService.gerarPrevia(dto, empresaId);
  }

  @Papeis('ADMIN', 'SUPERVISOR')
  @Post('gerar-faixa/confirmar')
  gerarConfirmar(@Body() dto: GerarFaixaDto, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.enderecosService.gerarConfirmar(dto, usuario.id, empresaId);
  }

  @Papeis('ADMIN', 'SUPERVISOR')
  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarEnderecoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.enderecosService.atualizar(id, dto, usuario.id, empresaId);
  }

  @Papeis('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  excluir(@Param('id', ParseIntPipe) id: number, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.enderecosService.excluir(id, usuario.id, empresaId);
  }
}
