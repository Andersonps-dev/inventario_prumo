import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { FormatoExportacao, TipoExportacao } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { EmpresaScopeGuard } from '../common/guards/empresa-scope.guard';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual, UsuarioAutenticado } from '../common/decorators/usuario-atual.decorator';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { ExportacaoService } from './exportacao.service';
import { SolicitarExportacaoDto } from './dto/solicitar-exportacao.dto';

// Exportação gera arquivo com o catálogo/estoque/movimentos inteiros da
// empresa — mesmo nível de acesso de relatórios, não o de quem só conta.
@Papeis('ADMIN', 'SUPERVISOR')
@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Controller('exportacoes')
export class ExportacaoController {
  constructor(private readonly exportacaoService: ExportacaoService) {}

  @Post(':tipo/:formato')
  async solicitar(
    @Param('tipo') tipoBruto: string,
    @Param('formato') formatoBruto: string,
    @Body() filtros: SolicitarExportacaoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
    @Res() res: Response,
  ) {
    const tipo = tipoBruto.toUpperCase() as TipoExportacao;
    const formato = formatoBruto.toUpperCase() as FormatoExportacao;
    if (!Object.values(TipoExportacao).includes(tipo)) throw new BadRequestException('Tipo de exportação inválido.');
    if (!Object.values(FormatoExportacao).includes(formato)) throw new BadRequestException('Formato de exportação inválido.');

    const resultado = await this.exportacaoService.solicitar(tipo, formato, filtros, usuario.id, empresaId);

    if (resultado.modo === 'sincrono') {
      res.setHeader('Content-Type', resultado.mime);
      res.setHeader('Content-Disposition', `attachment; filename="${resultado.nomeArquivo}"`);
      res.send(resultado.buffer);
      return;
    }

    res.status(202).json({ jobId: resultado.jobId, status: 'PENDENTE' });
  }

  @Get(':id')
  status(@Param('id', ParseIntPipe) id: number, @EmpresaAtual() empresaId: number) {
    return this.exportacaoService.status(id, empresaId);
  }

  @Get(':id/arquivo')
  async baixar(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @EmpresaAtual() empresaId: number) {
    const { caminho, nomeArquivo } = await this.exportacaoService.arquivo(id, empresaId);
    res.download(caminho, nomeArquivo);
  }
}
