import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditoriaService } from '../../common/auditoria/auditoria.service';
import { lerColunas, lerLinhas, paraNumero } from '../../common/planilha/planilha-reader';

export interface MapeamentoCampo {
  /** Nome da coluna no arquivo do cliente — se ausente, usa `padrao` pra toda linha. */
  coluna?: string;
  /** Valor literal usado quando o campo não foi mapeado a nenhuma coluna. */
  padrao?: string;
}

export interface MapeamentoProdutos {
  sku: MapeamentoCampo;
  nome: MapeamentoCampo;
  codigoBarras?: MapeamentoCampo;
  descricao?: MapeamentoCampo;
  unidade?: MapeamentoCampo;
  precoCusto?: MapeamentoCampo;
  estoqueMinimo?: MapeamentoCampo;
}

export interface LinhaValidada {
  linha: number;
  sku: string;
  codigoBarras: string | null;
  nome: string;
  descricao: string | null;
  unidade: string;
  precoCusto: number;
  estoqueMinimo: number;
  erros: string[];
}

const CAMPOS_SISTEMA = [
  { chave: 'sku', titulo: 'SKU', obrigatorio: true },
  { chave: 'nome', titulo: 'Nome', obrigatorio: true },
  { chave: 'codigoBarras', titulo: 'Código de barras', obrigatorio: false },
  { chave: 'descricao', titulo: 'Descrição', obrigatorio: false },
  { chave: 'unidade', titulo: 'Unidade', obrigatorio: false },
  { chave: 'precoCusto', titulo: 'Preço de custo', obrigatorio: false },
  { chave: 'estoqueMinimo', titulo: 'Estoque mínimo', obrigatorio: false },
] as const;

/** Resolve o valor de um campo pra uma linha: da coluna mapeada, ou do valor padrão configurado. */
function resolverCampo(linha: Record<string, string>, campo: MapeamentoCampo | undefined): string | undefined {
  if (campo?.coluna) return linha[campo.coluna];
  return campo?.padrao;
}

@Injectable()
export class ProdutosImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /** Passo 1: descobre as colunas do arquivo do cliente pra montar a tela De:/Para:. */
  async descobrirColunas(buffer: Buffer, nomeArquivo: string) {
    const colunas = await lerColunas(buffer, nomeArquivo);
    return { colunas, camposSistema: CAMPOS_SISTEMA };
  }

  async validar(
    buffer: Buffer,
    nomeArquivo: string,
    mapeamento: MapeamentoProdutos,
    empresaId: number,
  ): Promise<{ validas: LinhaValidada[]; comErro: LinhaValidada[] }> {
    if (!mapeamento.sku?.coluna) throw new BadRequestException('Mapeie a coluna de SKU.');
    if (!mapeamento.nome?.coluna) throw new BadRequestException('Mapeie a coluna de Nome.');

    const linhasArquivo = await lerLinhas(buffer, nomeArquivo);
    const produtosExistentes = await this.prisma.produto.findMany({ where: { empresaId }, select: { sku: true, codigoBarras: true } });
    const skusExistentes = new Set(produtosExistentes.map((p) => p.sku));
    const codigosExistentes = new Set(produtosExistentes.map((p) => p.codigoBarras).filter(Boolean));
    const skusNoArquivo = new Set<string>();
    const codigosBarraNoArquivo = new Set<string>();

    const resultado: LinhaValidada[] = linhasArquivo.map((linha, indice) => {
      const erros: string[] = [];
      const sku = (resolverCampo(linha, mapeamento.sku) ?? '').trim();
      const nome = (resolverCampo(linha, mapeamento.nome) ?? '').trim();
      const codigoBarras = (resolverCampo(linha, mapeamento.codigoBarras) ?? '').trim() || null;
      const unidade = (resolverCampo(linha, mapeamento.unidade) ?? 'UN').trim() || 'UN';
      const precoCusto = paraNumero(resolverCampo(linha, mapeamento.precoCusto) ?? '0');
      const estoqueMinimo = paraNumero(resolverCampo(linha, mapeamento.estoqueMinimo) ?? '0');

      if (!sku) erros.push('SKU é obrigatório.');
      else if (skusExistentes.has(sku)) erros.push(`SKU "${sku}" já existe no catálogo.`);
      else if (skusNoArquivo.has(sku)) erros.push(`SKU "${sku}" duplicado no arquivo.`);
      if (sku) skusNoArquivo.add(sku);

      if (!nome) erros.push('Nome é obrigatório.');
      if (codigoBarras && codigosExistentes.has(codigoBarras)) {
        erros.push(`Código de barras "${codigoBarras}" já existe no catálogo.`);
      } else if (codigoBarras && codigosBarraNoArquivo.has(codigoBarras)) {
        erros.push(`Código de barras "${codigoBarras}" duplicado no arquivo.`);
      }
      if (codigoBarras) codigosBarraNoArquivo.add(codigoBarras);
      if (precoCusto === null) erros.push('Preço de custo inválido.');
      if (estoqueMinimo === null) erros.push('Estoque mínimo inválido.');

      return {
        linha: indice + 2, // +1 cabeçalho, +1 para contagem humana a partir de 1
        sku,
        codigoBarras,
        nome,
        descricao: (resolverCampo(linha, mapeamento.descricao) ?? '').trim() || null,
        unidade,
        precoCusto: precoCusto ?? 0,
        estoqueMinimo: estoqueMinimo ?? 0,
        erros,
      };
    });

    return {
      validas: resultado.filter((l) => l.erros.length === 0),
      comErro: resultado.filter((l) => l.erros.length > 0),
    };
  }

  async confirmar(buffer: Buffer, nomeArquivo: string, mapeamento: MapeamentoProdutos, usuarioId: number, empresaId: number) {
    const { validas, comErro } = await this.validar(buffer, nomeArquivo, mapeamento, empresaId);
    if (validas.length === 0) {
      return { criados: 0, ignorados: comErro.length, detalhesErro: comErro };
    }

    let criados: { sku: string }[];
    try {
      criados = await this.prisma.$transaction(
        validas.map((linha) =>
          this.prisma.produto.create({
            data: {
              empresaId,
              sku: linha.sku,
              codigoBarras: linha.codigoBarras,
              nome: linha.nome,
              descricao: linha.descricao,
              unidade: linha.unidade,
              precoCusto: linha.precoCusto,
              estoqueMinimo: linha.estoqueMinimo,
            },
          }),
        ),
      );
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException(
          'Não foi possível gravar: algum produto ficou com SKU ou código de barras duplicado entre a prévia e a gravação. Gere a prévia novamente e tente de novo.',
        );
      }
      throw e;
    }

    await this.auditoria.registrar({
      entidade: 'produto',
      entidadeId: 0,
      acao: 'CRIAR',
      depois: { importacao: true, quantidade: criados.length, skus: criados.map((p) => p.sku) },
      usuarioId,
      empresaId,
    });

    return { criados: criados.length, ignorados: comErro.length, detalhesErro: comErro };
  }
}
