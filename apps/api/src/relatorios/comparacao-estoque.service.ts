import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { lerColunas, lerLinhas, paraNumero } from '../common/planilha/planilha-reader';

export interface MapeamentoComparacao {
  sku: { coluna: string };
  estoque: { coluna: string };
}

export type StatusComparacao = 'OK' | 'DIVERGENTE' | 'NAO_ENCONTRADO_NO_SISTEMA' | 'NAO_INFORMADO_PELO_CLIENTE';

export interface LinhaComparacao {
  sku: string;
  nome: string | null;
  estoqueCliente: number | null;
  estoquePrumo: number | null;
  diferenca: number | null;
  status: StatusComparacao;
}

export interface LinhaComparacaoComErro {
  linha: number;
  motivo: string;
}

export interface ResultadoComparacao {
  linhas: LinhaComparacao[];
  linhasComErro: LinhaComparacaoComErro[];
}

@Injectable()
export class ComparacaoEstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  async descobrirColunas(buffer: Buffer, nomeArquivo: string) {
    const colunas = await lerColunas(buffer, nomeArquivo);
    return { colunas };
  }

  async comparar(
    buffer: Buffer,
    nomeArquivo: string,
    mapeamento: MapeamentoComparacao,
    empresaId: number,
  ): Promise<ResultadoComparacao> {
    if (!mapeamento.sku?.coluna) throw new BadRequestException('Mapeie a coluna de SKU.');
    if (!mapeamento.estoque?.coluna) throw new BadRequestException('Mapeie a coluna de Estoque.');

    const linhasArquivo = await lerLinhas(buffer, nomeArquivo);

    // Soma por SKU — o arquivo do cliente pode ter o mesmo SKU em mais de uma linha.
    const estoqueClientePorSku = new Map<string, number>();
    const linhasComErro: LinhaComparacaoComErro[] = [];
    linhasArquivo.forEach((linha, indice) => {
      const numeroLinha = indice + 2; // linha 1 é o cabeçalho
      const sku = (linha[mapeamento.sku.coluna] ?? '').trim();
      if (!sku) {
        linhasComErro.push({ linha: numeroLinha, motivo: 'SKU vazio — linha ignorada.' });
        return;
      }
      const bruto = linha[mapeamento.estoque.coluna];
      const quantidade = paraNumero(bruto);
      if (quantidade === null) {
        // Sem isso, um valor não numérico ("N/D", célula de fórmula
        // quebrada) virava silenciosamente 0 — e uma divergência falsa de
        // "estoque zerado" aparecia pro usuário como se o cliente tivesse
        // de fato reportado zero, quando na real a célula era ilegível.
        linhasComErro.push({ linha: numeroLinha, motivo: `Estoque "${bruto ?? ''}" não é um número válido para o SKU "${sku}" — linha ignorada.` });
        return;
      }
      estoqueClientePorSku.set(sku, (estoqueClientePorSku.get(sku) ?? 0) + quantidade);
    });

    const produtos = await this.prisma.produto.findMany({
      where: { empresaId },
      select: { sku: true, nome: true, saldos: { select: { quantidade: true } } },
    });
    const produtoPorSku = new Map(
      produtos.map((p) => [p.sku, { nome: p.nome, saldo: p.saldos.reduce((soma, s) => soma + Number(s.quantidade), 0) }]),
    );

    const linhas: LinhaComparacao[] = [];
    const skusVistos = new Set<string>();

    for (const [sku, estoqueCliente] of estoqueClientePorSku) {
      skusVistos.add(sku);
      const produto = produtoPorSku.get(sku);
      if (!produto) {
        linhas.push({ sku, nome: null, estoqueCliente, estoquePrumo: null, diferenca: null, status: 'NAO_ENCONTRADO_NO_SISTEMA' });
        continue;
      }
      const diferenca = produto.saldo - estoqueCliente;
      linhas.push({
        sku,
        nome: produto.nome,
        estoqueCliente,
        estoquePrumo: produto.saldo,
        diferenca,
        status: diferenca === 0 ? 'OK' : 'DIVERGENTE',
      });
    }

    // Produtos do nosso catálogo que o cliente nem informou.
    for (const [sku, produto] of produtoPorSku) {
      if (skusVistos.has(sku)) continue;
      linhas.push({
        sku,
        nome: produto.nome,
        estoqueCliente: null,
        estoquePrumo: produto.saldo,
        diferenca: null,
        status: 'NAO_INFORMADO_PELO_CLIENTE',
      });
    }

    linhas.sort((a, b) => Math.abs(b.diferenca ?? 0) - Math.abs(a.diferenca ?? 0));
    return { linhas, linhasComErro };
  }
}
