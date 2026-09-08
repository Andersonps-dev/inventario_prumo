import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { EmpresaScopeGuard } from '../common/guards/empresa-scope.guard';
import { Papeis } from '../common/decorators/papeis.decorator';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { DepositosService } from './depositos.service';
import { CriarDepositoDto, AtualizarDepositoDto } from './dto/deposito.dto';

@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Controller('depositos')
export class DepositosController {
  constructor(private readonly depositosService: DepositosService) {}

  @Get()
  listar(@EmpresaAtual() empresaId: number) {
    return this.depositosService.listar(empresaId);
  }

  @Papeis('ADMIN')
  @Post()
  criar(@Body() dto: CriarDepositoDto, @EmpresaAtual() empresaId: number) {
    return this.depositosService.criar(dto, empresaId);
  }

  @Papeis('ADMIN')
  @Patch(':id')
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarDepositoDto, @EmpresaAtual() empresaId: number) {
    return this.depositosService.atualizar(id, dto, empresaId);
  }
}
