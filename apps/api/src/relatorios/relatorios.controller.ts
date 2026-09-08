import { BadRequestException, Body, Controller, Get, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { EmpresaScopeGuard } from '../common/guards/empresa-scope.guard';
import { Papeis } from '../common/decorators/papeis.decorator';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { RelatoriosService } from './relatorios.service';
import { ComparacaoEstoqueService, MapeamentoComparacao } from './comparacao-estoque.service';
import { FiltrosRelatorioDto } from './dto/filtros-relatorio.dto';
import { OPCOES_UPLOAD_PLANILHA } from '../common/upload/planilha-upload.options';

function parseMapeamento(bruto: string | undefined): MapeamentoComparacao {
  if (!bruto) throw new BadRequestException('mapeamento é obrigatório.');
  try {
    return JSON.parse(bruto) as MapeamentoComparacao;
  } catch {
    throw new BadRequestException('mapeamento inválido — deve ser um JSON.');
  }
}

function exigirArquivo(arquivo: Express.Multer.File | undefined): Express.Multer.File {
  if (!arquivo) throw new BadRequestException('Envie um arquivo.');
  return arquivo;
}

// Relatórios expõem catálogo/estoque agregado por completo — mesmo nível de
// acesso de quem já pode exportar dados em massa (produtos.controller.ts),
// não o de quem só faz contagem.
@Papeis('ADMIN', 'SUPERVISOR')
@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Controller('relatorios')
export class RelatoriosController {
  constructor(
    private readonly relatoriosService: RelatoriosService,
    private readonly comparacaoEstoqueService: ComparacaoEstoqueService,
  ) {}

  @Get('inventario')
  inventario(@Query() filtros: FiltrosRelatorioDto, @EmpresaAtual() empresaId: number) {
    return this.relatoriosService.inventario(filtros, empresaId);
  }

  @Post('comparacao-estoque/colunas')
  @UseInterceptors(FileInterceptor('arquivo', OPCOES_UPLOAD_PLANILHA))
  colunasComparacao(@UploadedFile() arquivoBruto: Express.Multer.File | undefined) {
    const arquivo = exigirArquivo(arquivoBruto);
    return this.comparacaoEstoqueService.descobrirColunas(arquivo.buffer, arquivo.originalname);
  }

  @Post('comparacao-estoque/comparar')
  @UseInterceptors(FileInterceptor('arquivo', OPCOES_UPLOAD_PLANILHA))
  comparar(
    @UploadedFile() arquivoBruto: Express.Multer.File | undefined,
    @Body('mapeamento') mapeamentoBruto: string | undefined,
    @EmpresaAtual() empresaId: number,
  ) {
    const arquivo = exigirArquivo(arquivoBruto);
    return this.comparacaoEstoqueService.comparar(arquivo.buffer, arquivo.originalname, parseMapeamento(mapeamentoBruto), empresaId);
  }
}
