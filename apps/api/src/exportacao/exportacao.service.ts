import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FormatoExportacao, Prisma, TipoExportacao } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../common/auditoria/auditoria.service';
import { EstoqueService } from '../estoque/estoque.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { RelatoriosService } from '../relatorios/relatorios.service';
import { SolicitarExportacaoDto } from './dto/solicitar-exportacao.dto';
import { DadosExportacao, Planilha } from './tipos';
import { paraCsv } from './serializadores/csv';
import { paraXlsx } from './serializadores/xlsx';
import { paraJson } from './serializadores/json';
import { paraXml } from './serializadores/xml';

const LIMITE_SINCRONO = 20_000;
const DIR_EXPORTS = path.join(process.cwd(), 'exports');

const MIME: Record<FormatoExportacao, string> = {
  CSV: 'text/csv; charset=utf-8',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  JSON: 'application/json; charset=utf-8',
  XML: 'application/xml; charset=utf-8',
};

const EXTENSAO: Record<FormatoExportacao, string> = { CSV: 'csv', XLSX: 'xlsx', JSON: 'json', XML: 'xml' };

@Injectable()
export class ExportacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly estoqueService: EstoqueService,
    private readonly dashboardService: DashboardService,
    private readonly relatoriosService: RelatoriosService,
  ) {}

  // ─────────────── Coleta de dados por tipo ───────────────

  private async coletar(tipo: TipoExportacao, filtros: SolicitarExportacaoDto, empresaId: number): Promise<DadosExportacao> {
    switch (tipo) {
      case 'CATALOGO':
        return this.coletarCatalogo(filtros, empresaId);
      case 'POSICAO_ESTOQUE':
        return this.coletarPosicaoEstoque(filtros, empresaId);
      case 'KARDEX':
        return this.coletarKardex(filtros, empresaId);
      case 'ESCOPO':
        return this.coletarEscopo(filtros, empresaId);
      case 'CONTAGENS':
        return this.coletarContagens(filtros, empresaId);
      case 'MOVIMENTOS':
        return this.coletarMovimentos(filtros, empresaId);
      case 'DASHBOARD':
        return this.coletarDashboard(filtros, empresaId);
      case 'RELATORIO_INVENTARIO':
        return this.coletarRelatorioInventario(filtros, empresaId);
      case 'RELATORIO_FEIRA':
        return this.coletarRelatorioFeira(filtros, empresaId);
    }
  }

  private async coletarCatalogo(_filtros: SolicitarExportacaoDto, empresaId: number): Promise<DadosExportacao> {
    const produtos = await this.prisma.produto.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } });
    const colunas = [
      { chave: 'sku', titulo: 'SKU' },
      { chave: 'codigoBarras', titulo: 'Código de barras' },
      { chave: 'nome', titulo: 'Nome' },
      { chave: 'unidade', titulo: 'Unidade' },
      { chave: 'precoCusto', titulo: 'Preço de custo' },
      { chave: 'estoqueMinimo', titulo: 'Estoque mínimo' },
      { chave: 'ativo', titulo: 'Ativo' },
    ];
    const linhas = produtos.map((p) => ({
      sku: p.sku,
      codigoBarras: p.codigoBarras,
      nome: p.nome,
      unidade: p.unidade,
      precoCusto: Number(p.precoCusto),
      estoqueMinimo: Number(p.estoqueMinimo),
      ativo: p.ativo,
    }));
    return { nomeArquivo: 'catalogo', planilhas: [{ nome: 'Catálogo', colunas, linhas }], jsonAninhado: linhas };
  }

  private async coletarPosicaoEstoque(filtros: SolicitarExportacaoDto, empresaId: number): Promise<DadosExportacao> {
    const linhasBrutas = await this.estoqueService.posicaoEstoque(empresaId, filtros.depositoId);
    const colunas = [
      { chave: 'posicao', titulo: 'Posição' },
      { chave: 'sku', titulo: 'SKU' },
      { chave: 'nome', titulo: 'Produto' },
      { chave: 'unidade', titulo: 'Unidade' },
      { chave: 'saldo', titulo: 'Saldo' },
      { chave: 'estoque_minimo', titulo: 'Estoque mínimo' },
      { chave: 'preco_custo', titulo: 'Preço de custo' },
      { chave: 'valor_total', titulo: 'Valor total' },
      { chave: 'ultima_movimentacao', titulo: 'Última movimentação' },
    ];
    return {
      nomeArquivo: 'posicao-estoque',
      planilhas: [{ nome: 'Posição de estoque', colunas, linhas: linhasBrutas as Record<string, unknown>[] }],
      jsonAninhado: linhasBrutas,
    };
  }

  private async coletarKardex(filtros: SolicitarExportacaoDto, empresaId: number): Promise<DadosExportacao> {
    if (!filtros.produtoId) throw new BadRequestException('produtoId é obrigatório para exportar o kardex.');
    const movimentos = await this.estoqueService.kardex(filtros.produtoId, empresaId);
    const colunas = [
      { chave: 'criadoEm', titulo: 'Data/hora' },
      { chave: 'tipo', titulo: 'Tipo' },
      { chave: 'quantidade', titulo: 'Quantidade' },
      { chave: 'saldoAnterior', titulo: 'Saldo anterior' },
      { chave: 'saldoPosterior', titulo: 'Saldo posterior' },
      { chave: 'endereco', titulo: 'Endereço' },
      { chave: 'origemTipo', titulo: 'Origem' },
      { chave: 'motivo', titulo: 'Motivo' },
      { chave: 'usuario', titulo: 'Usuário' },
    ];
    const linhas = movimentos.map((m) => ({
      criadoEm: m.criadoEm,
      tipo: m.tipo,
      quantidade: Number(m.quantidade),
      saldoAnterior: Number(m.saldoAnterior),
      saldoPosterior: Number(m.saldoPosterior),
      endereco: m.endereco.interno ? '' : m.endereco.codigo,
      origemTipo: m.origemTipo ?? '',
      motivo: m.motivo ?? '',
      usuario: m.usuario.nome,
    }));
    return { nomeArquivo: 'kardex', planilhas: [{ nome: 'Kardex', colunas, linhas }], jsonAninhado: movimentos };
  }

  private async coletarEscopo(filtros: SolicitarExportacaoDto, empresaId: number): Promise<DadosExportacao> {
    if (!filtros.escopoId) throw new BadRequestException('escopoId é obrigatório para exportar um escopo.');
    const escopo = await this.prisma.escopoInventario.findUnique({
      where: { id: filtros.escopoId },
      include: {
        deposito: true,
        responsavel: { select: { nome: true } },
        itens: {
          include: { produto: true, endereco: true, contagens: { orderBy: { sequencia: 'desc' } } },
        },
      },
    });
    if (!escopo || escopo.empresaId !== empresaId) throw new NotFoundException('Escopo de inventário não encontrado.');

    const colunasResumo = [
      { chave: 'codigo', titulo: 'Código' },
      { chave: 'titulo', titulo: 'Título' },
      { chave: 'status', titulo: 'Status' },
      { chave: 'deposito', titulo: 'Depósito' },
      { chave: 'responsavel', titulo: 'Responsável' },
      { chave: 'prazo', titulo: 'Prazo' },
      { chave: 'efetivadoEm', titulo: 'Efetivado em' },
    ];
    const linhasResumo = [
      {
        codigo: escopo.codigo,
        titulo: escopo.titulo,
        status: escopo.status,
        deposito: escopo.deposito.nome,
        responsavel: escopo.responsavel?.nome ?? '',
        prazo: escopo.prazo,
        efetivadoEm: escopo.efetivadoEm,
      },
    ];

    const colunasItens = [
      { chave: 'sku', titulo: 'SKU' },
      { chave: 'produto', titulo: 'Produto' },
      { chave: 'endereco', titulo: 'Endereço' },
      { chave: 'saldoCongelado', titulo: 'Saldo congelado' },
      { chave: 'quantidadeFinal', titulo: 'Quantidade contada' },
      { chave: 'diferenca', titulo: 'Diferença' },
      { chave: 'status', titulo: 'Status' },
    ];
    const linhasItens = escopo.itens.map((i) => ({
      sku: i.produto.sku,
      produto: i.produto.nome,
      endereco: i.endereco.interno ? '' : i.endereco.codigo,
      saldoCongelado: Number(i.saldoCongelado),
      quantidadeFinal: i.quantidadeFinal ? Number(i.quantidadeFinal) : null,
      diferenca: i.diferenca ? Number(i.diferenca) : null,
      status: i.status,
    }));

    const linhasDivergencias = linhasItens.filter((i) => i.diferenca !== null && i.diferenca !== 0);

    return {
      nomeArquivo: `escopo-${escopo.codigo}`,
      planilhas: [
        { nome: 'Resumo', colunas: colunasResumo, linhas: linhasResumo },
        { nome: 'Itens', colunas: colunasItens, linhas: linhasItens },
        { nome: 'Divergências', colunas: colunasItens, linhas: linhasDivergencias },
      ],
      jsonAninhado: {
        escopo: linhasResumo[0],
        itens: escopo.itens.map((i) => ({
          sku: i.produto.sku,
          produto: i.produto.nome,
          endereco: i.endereco.interno ? null : i.endereco.codigo,
          saldoCongelado: Number(i.saldoCongelado),
          quantidadeFinal: i.quantidadeFinal ? Number(i.quantidadeFinal) : null,
          diferenca: i.diferenca ? Number(i.diferenca) : null,
          status: i.status,
          contagens: i.contagens.map((c) => ({
            sequencia: c.sequencia,
            quantidade: Number(c.quantidade),
            status: c.status,
            contadoEm: c.contadoEm,
          })),
        })),
      },
    };
  }

  private async coletarContagens(filtros: SolicitarExportacaoDto, empresaId: number): Promise<DadosExportacao> {
    const contagens = await this.prisma.contagem.findMany({
      where: {
        empresaId,
        ...(filtros.escopoId ? { escopoItem: { escopoId: filtros.escopoId } } : {}),
      },
      include: {
        escopoItem: { include: { produto: true, escopo: true, endereco: true } },
        contadoPorUsuario: { select: { nome: true } },
      },
      orderBy: { contadoEm: 'desc' },
      take: LIMITE_SINCRONO * 2, // fallback de segurança; decisão sync/async usa este total
    });
    const colunas = [
      { chave: 'escopoCodigo', titulo: 'Escopo' },
      { chave: 'sku', titulo: 'SKU' },
      { chave: 'endereco', titulo: 'Endereço' },
      { chave: 'sequencia', titulo: 'Sequência' },
      { chave: 'quantidade', titulo: 'Quantidade' },
      { chave: 'status', titulo: 'Status' },
      { chave: 'contadoPor', titulo: 'Contado por' },
      { chave: 'contadoEm', titulo: 'Contado em' },
    ];
    const linhas = contagens.map((c) => ({
      escopoCodigo: c.escopoItem.escopo.codigo,
      sku: c.escopoItem.produto.sku,
      endereco: c.escopoItem.endereco.interno ? '' : c.escopoItem.endereco.codigo,
      sequencia: c.sequencia,
      quantidade: Number(c.quantidade),
      status: c.status,
      contadoPor: c.contadoPorUsuario.nome,
      contadoEm: c.contadoEm,
    }));
    return { nomeArquivo: 'contagens', planilhas: [{ nome: 'Contagens', colunas, linhas }], jsonAninhado: linhas };
  }

  private async coletarMovimentos(filtros: SolicitarExportacaoDto, empresaId: number): Promise<DadosExportacao> {
    const condicoes: Prisma.MovimentoEstoqueWhereInput = { empresaId };
    if (filtros.produtoId) condicoes.produtoId = filtros.produtoId;
    if (filtros.depositoId) condicoes.depositoId = filtros.depositoId;
    if (filtros.dataInicio || filtros.dataFim) {
      condicoes.criadoEm = {
        gte: filtros.dataInicio ? new Date(filtros.dataInicio) : undefined,
        lte: filtros.dataFim ? new Date(filtros.dataFim) : undefined,
      };
    }
    const movimentos = await this.prisma.movimentoEstoque.findMany({
      where: condicoes,
      include: { produto: true, endereco: true, usuario: { select: { nome: true } } },
      orderBy: { criadoEm: 'desc' },
      take: LIMITE_SINCRONO * 2,
    });
    const colunas = [
      { chave: 'criadoEm', titulo: 'Data/hora' },
      { chave: 'sku', titulo: 'SKU' },
      { chave: 'produto', titulo: 'Produto' },
      { chave: 'endereco', titulo: 'Endereço' },
      { chave: 'tipo', titulo: 'Tipo' },
      { chave: 'quantidade', titulo: 'Quantidade' },
      { chave: 'saldoPosterior', titulo: 'Saldo posterior' },
      { chave: 'origemTipo', titulo: 'Origem' },
      { chave: 'motivo', titulo: 'Motivo' },
      { chave: 'usuario', titulo: 'Usuário' },
    ];
    const linhas = movimentos.map((m) => ({
      criadoEm: m.criadoEm,
      sku: m.produto.sku,
      produto: m.produto.nome,
      endereco: m.endereco.interno ? '' : m.endereco.codigo,
      tipo: m.tipo,
      quantidade: Number(m.quantidade),
      saldoPosterior: Number(m.saldoPosterior),
      origemTipo: m.origemTipo ?? '',
      motivo: m.motivo ?? '',
      usuario: m.usuario.nome,
    }));
    return { nomeArquivo: 'movimentos', planilhas: [{ nome: 'Movimentos', colunas, linhas }], jsonAninhado: linhas };
  }

  private async coletarDashboard(filtros: SolicitarExportacaoDto, empresaId: number): Promise<DadosExportacao> {
    const [saude, qualidade, operacao] = await Promise.all([
      this.dashboardService.saudeEstoque(filtros, empresaId),
      this.dashboardService.qualidadeInventario(filtros, empresaId),
      this.dashboardService.operacao(filtros, empresaId),
    ]);

    const planilhaSaude: Planilha = {
      nome: 'Saúde do estoque',
      colunas: [
        { chave: 'indicador', titulo: 'Indicador' },
        { chave: 'valor', titulo: 'Valor' },
      ],
      linhas: [
        { indicador: 'Valor total a custo', valor: saude.valorTotalCusto },
        { indicador: 'SKUs ativos', valor: saude.skusAtivos },
        { indicador: 'SKUs zerados', valor: saude.skusZerados },
        { indicador: 'Abaixo do mínimo', valor: saude.skusAbaixoDoMinimo },
        { indicador: 'Sem movimento > 90 dias', valor: saude.semMovimento90d },
      ],
    };
    const planilhaQualidade: Planilha = {
      nome: 'Qualidade do inventário',
      colunas: [
        { chave: 'indicador', titulo: 'Indicador' },
        { chave: 'valor', titulo: 'Valor' },
      ],
      linhas: [
        { indicador: 'Acuracidade por item (%)', valor: qualidade.acuraciadePorItem },
        { indicador: 'Acuracidade por valor (%)', valor: qualidade.acuraciadePorValor },
        { indicador: 'Divergência líquida (R$)', valor: qualidade.divergenciaLiquidaReais },
        { indicador: 'Produtos reincidentes', valor: qualidade.reincidencia.length },
      ],
    };
    const planilhaOperacao: Planilha = {
      nome: 'Operação',
      colunas: [
        { chave: 'indicador', titulo: 'Indicador' },
        { chave: 'valor', titulo: 'Valor' },
      ],
      linhas: [
        { indicador: 'Escopos abertos', valor: operacao.escoposAbertos.length },
        { indicador: 'Itens nunca inventariados', valor: operacao.itensNuncaInventariados.length },
        { indicador: 'Tempo médio abertura → efetivação (h)', valor: operacao.tempoMedioAberturaEfetivacaoHoras ?? 0 },
      ],
    };

    return {
      nomeArquivo: 'dashboard',
      planilhas: [planilhaSaude, planilhaQualidade, planilhaOperacao],
      jsonAninhado: { saude, qualidade, operacao },
    };
  }

  private async coletarRelatorioInventario(filtros: SolicitarExportacaoDto, empresaId: number): Promise<DadosExportacao> {
    const linhas = await this.relatoriosService.inventario(filtros, empresaId);
    const colunas = [
      { chave: 'data', titulo: 'Data' },
      { chave: 'sku', titulo: 'SKU' },
      { chave: 'codigoBarras', titulo: 'Código de barras' },
      { chave: 'nome', titulo: 'Produto' },
      { chave: 'deposito', titulo: 'Depósito' },
      { chave: 'enderecoCodigo', titulo: 'Endereço' },
      { chave: 'escopoCodigo', titulo: 'Escopo' },
      { chave: 'saldoEstoque', titulo: 'Saldo em estoque' },
      { chave: 'contagem', titulo: 'Contagem' },
      { chave: 'diferenca', titulo: 'Diferença' },
    ];
    return {
      nomeArquivo: 'relatorio-inventario',
      planilhas: [{ nome: 'Relatório de inventário', colunas, linhas: linhas as unknown as Record<string, unknown>[] }],
      jsonAninhado: linhas,
    };
  }

  private async coletarRelatorioFeira(filtros: SolicitarExportacaoDto, empresaId: number): Promise<DadosExportacao> {
    if (!filtros.eventoVendaId) throw new BadRequestException('eventoVendaId é obrigatório para exportar o relatório de uma feira.');
    const evento = await this.prisma.eventoVenda.findUnique({ where: { id: filtros.eventoVendaId } });
    if (!evento || evento.empresaId !== empresaId) throw new NotFoundException('Evento de venda não encontrado.');
    if (evento.status !== 'FECHADO' || !evento.relatorioFechamento) {
      throw new BadRequestException('Essa feira ainda está aberta — feche pra gerar o relatório antes de exportar.');
    }

    const relatorio = evento.relatorioFechamento as unknown as {
      itens: { sku: string; nome: string; unidade: string; quantidade: number; precoCustoUnitario: number; valorTotal: number }[];
      quantidadeTotal: number;
      valorTotal: number;
    };

    const colunas = [
      { chave: 'sku', titulo: 'SKU' },
      { chave: 'produto', titulo: 'Produto' },
      { chave: 'unidade', titulo: 'Unidade' },
      { chave: 'quantidade', titulo: 'Quantidade vendida' },
      { chave: 'valorUnitario', titulo: 'Valor unit. (custo)' },
      { chave: 'valorTotal', titulo: 'Valor total' },
    ];
    const linhas = relatorio.itens.map((i) => ({
      sku: i.sku,
      produto: i.nome,
      unidade: i.unidade,
      quantidade: i.quantidade,
      valorUnitario: i.precoCustoUnitario,
      valorTotal: i.valorTotal,
    }));
    linhas.push({
      sku: '',
      produto: 'TOTAL',
      unidade: '',
      quantidade: relatorio.quantidadeTotal,
      valorUnitario: undefined as unknown as number,
      valorTotal: relatorio.valorTotal,
    });

    return {
      nomeArquivo: `feira-${evento.titulo.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
      planilhas: [{ nome: 'Relatório de venda', colunas, linhas }],
      jsonAninhado: { titulo: evento.titulo, ...relatorio },
    };
  }

  // ─────────────── Serialização ───────────────

  private async serializar(dados: DadosExportacao, formato: FormatoExportacao, tipo: TipoExportacao): Promise<Buffer> {
    switch (formato) {
      case 'CSV':
        return paraCsv(dados.planilhas[0]);
      case 'XLSX':
        return paraXlsx(dados.planilhas);
      case 'JSON':
        return paraJson(dados.jsonAninhado ?? dados.planilhas);
      case 'XML':
        return paraXml(tipo, dados.planilhas[0]);
    }
  }

  private contarLinhas(dados: DadosExportacao): number {
    return Math.max(...dados.planilhas.map((p) => p.linhas.length), 0);
  }

  // ─────────────── Orquestração síncrona/assíncrona ───────────────

  async solicitar(
    tipo: TipoExportacao,
    formato: FormatoExportacao,
    filtros: SolicitarExportacaoDto,
    usuarioId: number,
    empresaId: number,
  ): Promise<{ modo: 'sincrono'; buffer: Buffer; nomeArquivo: string; mime: string } | { modo: 'assincrono'; jobId: number }> {
    const dados = await this.coletar(tipo, filtros, empresaId);
    const totalLinhas = this.contarLinhas(dados);

    if (totalLinhas <= LIMITE_SINCRONO) {
      const buffer = await this.serializar(dados, formato, tipo);
      await this.auditoria.registrar({
        entidade: 'exportacao',
        entidadeId: 0,
        acao: 'EXPORTAR',
        depois: { tipo, formato, totalLinhas, modo: 'sincrono' },
        usuarioId,
        empresaId,
      });
      return {
        modo: 'sincrono',
        buffer,
        nomeArquivo: `${dados.nomeArquivo}.${EXTENSAO[formato]}`,
        mime: MIME[formato],
      };
    }

    const job = await this.prisma.exportacaoJob.create({
      data: { empresaId, tipo, formato, filtros: filtros as unknown as Prisma.InputJsonValue, criadoPor: usuarioId },
    });

    setImmediate(() => this.processarJob(job.id, tipo, formato, filtros, usuarioId, empresaId));

    return { modo: 'assincrono', jobId: job.id };
  }

  private async processarJob(
    jobId: number,
    tipo: TipoExportacao,
    formato: FormatoExportacao,
    filtros: SolicitarExportacaoDto,
    usuarioId: number,
    empresaId: number,
  ) {
    try {
      await this.prisma.exportacaoJob.update({ where: { id: jobId }, data: { status: 'PROCESSANDO' } });
      const dados = await this.coletar(tipo, filtros, empresaId);
      const buffer = await this.serializar(dados, formato, tipo);

      fs.mkdirSync(DIR_EXPORTS, { recursive: true });
      const nomeArquivo = `${jobId}-${dados.nomeArquivo}.${EXTENSAO[formato]}`;
      const caminho = path.join(DIR_EXPORTS, nomeArquivo);
      fs.writeFileSync(caminho, buffer);

      await this.prisma.exportacaoJob.update({
        where: { id: jobId },
        data: { status: 'CONCLUIDO', caminho: nomeArquivo, concluidoEm: new Date() },
      });
      await this.auditoria.registrar({
        entidade: 'exportacao',
        entidadeId: jobId,
        acao: 'EXPORTAR',
        depois: { tipo, formato, modo: 'assincrono' },
        usuarioId,
        empresaId,
      });
    } catch (erro) {
      await this.prisma.exportacaoJob.update({
        where: { id: jobId },
        data: { status: 'ERRO', erro: erro instanceof Error ? erro.message : 'Erro desconhecido.' },
      });
    }
  }

  async status(jobId: number, empresaId: number) {
    const job = await this.prisma.exportacaoJob.findUnique({ where: { id: jobId } });
    if (!job || job.empresaId !== empresaId) throw new NotFoundException('Exportação não encontrada.');
    return job;
  }

  async arquivo(jobId: number, empresaId: number): Promise<{ caminho: string; formato: FormatoExportacao; nomeArquivo: string }> {
    const job = await this.status(jobId, empresaId);
    if (job.status !== 'CONCLUIDO' || !job.caminho) {
      throw new BadRequestException('Exportação ainda não concluída.');
    }
    return { caminho: path.join(DIR_EXPORTS, job.caminho), formato: job.formato, nomeArquivo: job.caminho };
  }
}
