import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { EmpresaScopeGuard } from '../common/guards/empresa-scope.guard';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual, UsuarioAutenticado } from '../common/decorators/usuario-atual.decorator';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EstoqueService } from './estoque.service';
import { DepositosService } from '../depositos/depositos.service';
import { EnderecosService } from '../enderecos/enderecos.service';
import { RegistrarMovimentoManualDto } from './dto/registrar-movimento-manual.dto';

@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Controller('estoque')
export class EstoqueController {
  constructor(
    private readonly estoqueService: EstoqueService,
    private readonly depositosService: DepositosService,
    private readonly enderecosService: EnderecosService,
  ) {}

  @Get('posicao')
  posicao(@Query('depositoId') depositoId: string | undefined, @EmpresaAtual() empresaId: number) {
    return this.estoqueService.posicaoEstoque(empresaId, depositoId ? Number(depositoId) : undefined);
  }

  @Get('posicao/:produtoId/enderecos')
  posicaoPorEndereco(
    @Param('produtoId', ParseIntPipe) produtoId: number,
    @Query('depositoId') depositoId: string | undefined,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.estoqueService.posicaoPorEndereco(produtoId, empresaId, depositoId ? Number(depositoId) : undefined);
  }

  @Get('kardex/:produtoId')
  kardex(@Param('produtoId', ParseIntPipe) produtoId: number, @EmpresaAtual() empresaId: number) {
    return this.estoqueService.kardex(produtoId, empresaId);
  }

  @Papeis('SUPERVISOR', 'ADMIN')
  @Post('movimentos')
  async registrarMovimentoManual(
    @Body() dto: RegistrarMovimentoManualDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    const depositoId = dto.depositoId
      ? (await this.depositosService.exigirAtivo(dto.depositoId, empresaId)).id
      : (await this.depositosService.obterPadrao(empresaId)).id;
    const enderecoId = dto.enderecoId ?? (await this.enderecosService.obterSentinela(depositoId, empresaId)).id;
    return this.estoqueService.registrarMovimentoManual({
      empresaId,
      produtoId: dto.produtoId,
      depositoId,
      enderecoId,
      tipo: dto.tipo,
      quantidade: dto.quantidade,
      motivo: dto.motivo,
      usuarioId: usuario.id,
    });
  }
}
