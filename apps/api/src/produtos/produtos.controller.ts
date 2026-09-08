import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PapeisGuard } from '../common/guards/papeis.guard';
import { EmpresaScopeGuard } from '../common/guards/empresa-scope.guard';
import { Papeis } from '../common/decorators/papeis.decorator';
import { UsuarioAtual, UsuarioAutenticado } from '../common/decorators/usuario-atual.decorator';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { ProdutosService } from './produtos.service';
import { CriarProdutoDto, AtualizarProdutoDto, ListarProdutosQueryDto } from './dto/produto.dto';
import { ProdutosImportService, MapeamentoProdutos } from './import/produtos-import.service';
import { OPCOES_UPLOAD_PLANILHA } from '../common/upload/planilha-upload.options';

function parseMapeamento(bruto: string | undefined): MapeamentoProdutos {
  if (!bruto) throw new BadRequestException('mapeamento é obrigatório.');
  try {
    return JSON.parse(bruto) as MapeamentoProdutos;
  } catch {
    throw new BadRequestException('mapeamento inválido — deve ser um JSON.');
  }
}

function exigirArquivo(arquivo: Express.Multer.File | undefined): Express.Multer.File {
  if (!arquivo) throw new BadRequestException('Envie um arquivo.');
  return arquivo;
}

@UseGuards(JwtAuthGuard, EmpresaScopeGuard, PapeisGuard)
@Controller('produtos')
export class ProdutosController {
  constructor(
    private readonly produtosService: ProdutosService,
    private readonly importService: ProdutosImportService,
  ) {}

  @Get()
  listar(@Query() query: ListarProdutosQueryDto, @EmpresaAtual() empresaId: number) {
    return this.produtosService.listar(query, empresaId);
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number, @EmpresaAtual() empresaId: number) {
    return this.produtosService.buscarPorId(id, empresaId);
  }

  @Papeis('ADMIN', 'SUPERVISOR')
  @Post()
  criar(@Body() dto: CriarProdutoDto, @UsuarioAtual() usuario: UsuarioAutenticado, @EmpresaAtual() empresaId: number) {
    return this.produtosService.criar(dto, usuario.id, empresaId);
  }

  @Papeis('ADMIN', 'SUPERVISOR')
  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarProdutoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    return this.produtosService.atualizar(id, dto, usuario.id, empresaId);
  }

  @Papeis('ADMIN')
  @Post('importar/colunas')
  @UseInterceptors(FileInterceptor('arquivo', OPCOES_UPLOAD_PLANILHA))
  colunasImportacao(@UploadedFile() arquivoBruto: Express.Multer.File | undefined) {
    const arquivo = exigirArquivo(arquivoBruto);
    return this.importService.descobrirColunas(arquivo.buffer, arquivo.originalname);
  }

  @Papeis('ADMIN')
  @Post('importar/previa')
  @UseInterceptors(FileInterceptor('arquivo', OPCOES_UPLOAD_PLANILHA))
  previaImportacao(
    @UploadedFile() arquivoBruto: Express.Multer.File | undefined,
    @Body('mapeamento') mapeamentoBruto: string | undefined,
    @EmpresaAtual() empresaId: number,
  ) {
    const arquivo = exigirArquivo(arquivoBruto);
    return this.importService.validar(arquivo.buffer, arquivo.originalname, parseMapeamento(mapeamentoBruto), empresaId);
  }

  @Papeis('ADMIN')
  @Post('importar/confirmar')
  @UseInterceptors(FileInterceptor('arquivo', OPCOES_UPLOAD_PLANILHA))
  confirmarImportacao(
    @UploadedFile() arquivoBruto: Express.Multer.File | undefined,
    @Body('mapeamento') mapeamentoBruto: string | undefined,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EmpresaAtual() empresaId: number,
  ) {
    const arquivo = exigirArquivo(arquivoBruto);
    return this.importService.confirmar(
      arquivo.buffer,
      arquivo.originalname,
      parseMapeamento(mapeamentoBruto),
      usuario.id,
      empresaId,
    );
  }
}
