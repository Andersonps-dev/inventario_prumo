import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardCacheService } from './dashboard-cache.service';
import { FiltrosDashboardDto } from './dto/filtros-dashboard.dto';

function chaveCache(prefixo: string, filtros: FiltrosDashboardDto, empresaId: number) {
  return `${prefixo}:${empresaId}:${filtros.depositoId ?? ''}:${filtros.dataInicio ?? ''}:${filtros.dataFim ?? ''}`;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: DashboardCacheService,
  ) {}

  invalidarCache() {
    this.cache.invalidar();
  }

  // ─────────────── Bloco 1 — Saúde do estoque ───────────────

  async saudeEstoque(filtros: FiltrosDashboardDto, empresaId: number) {
    return this.cache.comCache(chaveCache('saude', filtros, empresaId), async () => {
      const condProduto: Prisma.Sql[] = [Prisma.sql`p.ativo = true`, Prisma.sql`p.empresa_id = ${empresaId}`];
      const whereProduto = Prisma.join(condProduto, ' AND ');
      const filtroDeposito = filtros.depositoId ? Prisma.sql`AND s.deposito_id = ${filtros.depositoId}` : Prisma.empty;
      const filtroDepositoMov = filtros.depositoId ? Prisma.sql`AND m.deposito_id = ${filtros.depositoId}` : Prisma.empty;

      const linhas = await this.prisma.$queryRaw<
        {
          produto_id: number;
          sku: string;
          nome: string;
          saldo: number;
          preco_custo: number;
          estoque_minimo: number;
          valor: number;
          ultima_movimentacao: Date | null;
        }[]
      >(Prisma.sql`
        SELECT p.id AS produto_id, p.sku, p.nome,
               COALESCE(saldo_agg.total, 0)::float8 AS saldo,
               p.preco_custo::float8 AS preco_custo,
               p.estoque_minimo::float8 AS estoque_minimo,
               (COALESCE(saldo_agg.total, 0) * p.preco_custo)::float8 AS valor,
               mov_agg.ultima AS ultima_movimentacao
        FROM produto p
        LEFT JOIN (
          SELECT s.produto_id, SUM(s.quantidade) AS total
          FROM saldo_estoque s
          WHERE s.empresa_id = ${empresaId} ${filtroDeposito}
          GROUP BY s.produto_id
        ) saldo_agg ON saldo_agg.produto_id = p.id
        LEFT JOIN (
          SELECT m.produto_id, MAX(m.criado_em) AS ultima
          FROM movimento_estoque m
          WHERE m.empresa_id = ${empresaId} ${filtroDepositoMov}
          GROUP BY m.produto_id
        ) mov_agg ON mov_agg.produto_id = p.id
        WHERE ${whereProduto}
      `);

      const limite90d = new Date();
      limite90d.setDate(limite90d.getDate() - 90);

      const valorTotalCusto = linhas.reduce((soma, l) => soma + l.valor, 0);
      const skusAtivos = linhas.length;
      const skusZerados = linhas.filter((l) => l.saldo === 0).length;
      const skusAbaixoDoMinimo = linhas.filter((l) => l.saldo < l.estoque_minimo).length;
      const semMovimento90d = linhas.filter((l) => !l.ultima_movimentacao || l.ultima_movimentacao < limite90d).length;

      // Curva ABC por valor
      const ordenados = [...linhas].sort((a, b) => b.valor - a.valor);
      let acumulado = 0;
      const classificados = ordenados.map((l) => {
        acumulado += l.valor;
        const percentualAcumulado = valorTotalCusto > 0 ? (acumulado / valorTotalCusto) * 100 : 0;
        const classe = percentualAcumulado <= 80 ? 'A' : percentualAcumulado <= 95 ? 'B' : 'C';
        return { ...l, percentualAcumulado, classe };
      });
      const curvaAbc = ['A', 'B', 'C'].map((classe) => {
        const doGrupo = classificados.filter((c) => c.classe === classe);
        return {
          classe,
          quantidadeSkus: doGrupo.length,
          valor: doGrupo.reduce((s, i) => s + i.valor, 0),
          percentualDoValor: valorTotalCusto > 0 ? (doGrupo.reduce((s, i) => s + i.valor, 0) / valorTotalCusto) * 100 : 0,
        };
      });

      const top10 = ordenados.slice(0, 10).map((l) => ({
        produtoId: l.produto_id,
        sku: l.sku,
        nome: l.nome,
        saldo: l.saldo,
        valor: l.valor,
      }));

      return {
        valorTotalCusto,
        skusAtivos,
        skusZerados,
        skusAbaixoDoMinimo,
        semMovimento90d,
        curvaAbc,
        top10ValorImobilizado: top10,
      };
    });
  }

  async semMovimento(empresaId: number, dias = 90) {
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    return this.prisma.$queryRaw`
      SELECT p.id AS produto_id, p.sku, p.nome, MAX(m.criado_em) AS ultima_movimentacao
      FROM produto p
      LEFT JOIN movimento_estoque m ON m.produto_id = p.id AND m.empresa_id = ${empresaId}
      WHERE p.ativo = true AND p.empresa_id = ${empresaId}
      GROUP BY p.id
      HAVING MAX(m.criado_em) IS NULL OR MAX(m.criado_em) < ${limite}
      ORDER BY p.nome ASC
    `;
  }

  // ─────────────── Bloco 2 — Qualidade do inventário ───────────────

  async qualidadeInventario(filtros: FiltrosDashboardDto, empresaId: number) {
    return this.cache.comCache(chaveCache('qualidade', filtros, empresaId), async () => {
      const cond: Prisma.Sql[] = [
        Prisma.sql`e.empresa_id = ${empresaId}`,
        Prisma.sql`e.status = 'EFETIVADO'`,
        Prisma.sql`ei.status = 'CONTADO'`,
      ];
      if (filtros.depositoId) cond.push(Prisma.sql`e.deposito_id = ${filtros.depositoId}`);
      if (filtros.dataInicio) cond.push(Prisma.sql`e.efetivado_em >= ${new Date(filtros.dataInicio)}`);
      if (filtros.dataFim) cond.push(Prisma.sql`e.efetivado_em <= ${new Date(filtros.dataFim)}`);
      const where = Prisma.join(cond, ' AND ');

      const itens = await this.prisma.$queryRaw<
        {
          escopo_id: number;
          codigo: string;
          efetivado_em: Date;
          item_id: number;
          produto_id: number;
          sku: string;
          nome: string;
          quantidade_final: number;
          diferenca: number;
          preco_custo: number;
          contado_por: number | null;
          contado_por_nome: string | null;
        }[]
      >(Prisma.sql`
        SELECT e.id AS escopo_id, e.codigo, e.efetivado_em,
               ei.id AS item_id, p.id AS produto_id, p.sku, p.nome,
               ei.quantidade_final::float8 AS quantidade_final, ei.diferenca::float8 AS diferenca,
               p.preco_custo::float8 AS preco_custo,
               u.id AS contado_por, u.nome AS contado_por_nome
        FROM escopo_item ei
        JOIN escopo_inventario e ON e.id = ei.escopo_id
        JOIN produto p ON p.id = ei.produto_id
        LEFT JOIN contagem ct ON ct.escopo_item_id = ei.id AND ct.status = 'VALIDA'
        LEFT JOIN usuario u ON u.id = ct.contado_por
        WHERE ${where}
      `);

      const totalContados = itens.length;
      const semDivergencia = itens.filter((i) => i.diferenca === 0).length;
      const acuraciadePorItem = totalContados > 0 ? (semDivergencia / totalContados) * 100 : 100;

      const valorTotalContado = itens.reduce((s, i) => s + i.quantidade_final * i.preco_custo, 0);
      const impactoDivergencias = itens.reduce((s, i) => s + Math.abs(i.diferenca) * i.preco_custo, 0);
      const acuraciadePorValor = valorTotalContado > 0 ? (1 - impactoDivergencias / valorTotalContado) * 100 : 100;

      const divergenciaLiquidaReais = itens.reduce((s, i) => s + i.diferenca * i.preco_custo, 0);

      const comImpacto = itens.map((i) => ({
        itemId: i.item_id,
        escopoCodigo: i.codigo,
        sku: i.sku,
        nome: i.nome,
        diferenca: i.diferenca,
        impactoReais: i.diferenca * i.preco_custo,
      }));
      const topDivergenciasAbsolutas = [...comImpacto].sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca)).slice(0, 10);
      const topDivergenciasValor = [...comImpacto].sort((a, b) => Math.abs(b.impactoReais) - Math.abs(a.impactoReais)).slice(0, 10);

      const porResponsavel = new Map<string, { unidades: number; reais: number }>();
      for (const i of itens) {
        const chave = i.contado_por_nome ?? 'Desconhecido';
        const atual = porResponsavel.get(chave) ?? { unidades: 0, reais: 0 };
        atual.unidades += Math.abs(i.diferenca);
        atual.reais += Math.abs(i.diferenca * i.preco_custo);
        porResponsavel.set(chave, atual);
      }
      const divergenciaPorResponsavel = [...porResponsavel.entries()].map(([responsavel, v]) => ({ responsavel, ...v }));

      // Reincidência: produto com diferença != 0 nos últimos 2+ inventários efetivados seguidos
      const porProduto = new Map<number, { sku: string; nome: string; historico: { efetivadoEm: Date; diferenca: number }[] }>();
      for (const i of itens) {
        const atual = porProduto.get(i.produto_id) ?? { sku: i.sku, nome: i.nome, historico: [] };
        atual.historico.push({ efetivadoEm: i.efetivado_em, diferenca: i.diferenca });
        porProduto.set(i.produto_id, atual);
      }
      const reincidencia = [...porProduto.entries()]
        .map(([produtoId, v]) => {
          const ordenado = v.historico.sort((a, b) => a.efetivadoEm.getTime() - b.efetivadoEm.getTime());
          let sequenciaAtual = 0;
          for (const h of ordenado) {
            sequenciaAtual = h.diferenca !== 0 ? sequenciaAtual + 1 : 0;
          }
          return { produtoId, sku: v.sku, nome: v.nome, inventariosConsecutivosDivergentes: sequenciaAtual };
        })
        .filter((r) => r.inventariosConsecutivosDivergentes >= 2)
        .sort((a, b) => b.inventariosConsecutivosDivergentes - a.inventariosConsecutivosDivergentes);

      // Evolução da acuracidade por inventário efetivado
      const porEscopo = new Map<number, { codigo: string; efetivadoEm: Date; itens: typeof itens }>();
      for (const i of itens) {
        const atual = porEscopo.get(i.escopo_id) ?? { codigo: i.codigo, efetivadoEm: i.efetivado_em, itens: [] };
        atual.itens.push(i);
        porEscopo.set(i.escopo_id, atual);
      }
      const evolucaoAcuracidade = [...porEscopo.entries()]
        .map(([escopoId, v]) => {
          const totalItens = v.itens.length;
          const semDiv = v.itens.filter((i) => i.diferenca === 0).length;
          const valorContado = v.itens.reduce((s, i) => s + i.quantidade_final * i.preco_custo, 0);
          const impacto = v.itens.reduce((s, i) => s + Math.abs(i.diferenca) * i.preco_custo, 0);
          return {
            escopoId,
            codigo: v.codigo,
            efetivadoEm: v.efetivadoEm,
            acuraciadePorItem: totalItens > 0 ? (semDiv / totalItens) * 100 : 100,
            acuraciadePorValor: valorContado > 0 ? (1 - impacto / valorContado) * 100 : 100,
          };
        })
        .sort((a, b) => a.efetivadoEm.getTime() - b.efetivadoEm.getTime());

      return {
        acuraciadePorItem,
        acuraciadePorValor,
        divergenciaLiquidaReais,
        topDivergenciasAbsolutas,
        topDivergenciasValor,
        divergenciaPorResponsavel,
        reincidencia,
        evolucaoAcuracidade,
      };
    });
  }

  // ─────────────── Bloco 3 — Operação ───────────────

  async operacao(filtros: FiltrosDashboardDto, empresaId: number) {
    return this.cache.comCache(chaveCache('operacao', filtros, empresaId), async () => {
      const condEscopo: Prisma.Sql[] = [Prisma.sql`e.empresa_id = ${empresaId}`];
      if (filtros.depositoId) condEscopo.push(Prisma.sql`e.deposito_id = ${filtros.depositoId}`);
      const whereEscopo = Prisma.join(condEscopo, ' AND ');

      const escoposAbertosRaw = await this.prisma.$queryRaw<
        { id: number; codigo: string; titulo: string; status: string; prazo: Date | null; total: bigint; contados: bigint }[]
      >(Prisma.sql`
        SELECT e.id, e.codigo, e.titulo, e.status, e.prazo,
               COUNT(ei.id) FILTER (WHERE ei.status <> 'CANCELADO')::bigint AS total,
               COUNT(ei.id) FILTER (WHERE ei.status = 'CONTADO')::bigint AS contados
        FROM escopo_inventario e
        LEFT JOIN escopo_item ei ON ei.escopo_id = e.id
        WHERE e.status IN ('ABERTO', 'EM_CONTAGEM', 'CONFERENCIA') AND ${whereEscopo}
        GROUP BY e.id
        ORDER BY e.prazo ASC NULLS LAST
      `);
      const hoje = new Date();
      const escoposAbertos = escoposAbertosRaw.map((e) => ({
        id: e.id,
        codigo: e.codigo,
        titulo: e.titulo,
        status: e.status,
        percentualConcluido: Number(e.total) > 0 ? (Number(e.contados) / Number(e.total)) * 100 : 0,
        diasAtePrazo: e.prazo ? Math.ceil((e.prazo.getTime() - hoje.getTime()) / 86400000) : null,
      }));

      const condProduto: Prisma.Sql[] = [Prisma.sql`p.ativo = true`, Prisma.sql`p.empresa_id = ${empresaId}`];
      const whereProduto = Prisma.join(condProduto, ' AND ');

      const cobertura = await this.prisma.$queryRaw<{ dias: number; cobertos: bigint; total: bigint }[]>(Prisma.sql`
        WITH catalogo AS (SELECT p.id FROM produto p WHERE ${whereProduto}),
        ultimas AS (
          SELECT ei.produto_id, MAX(c.contado_em) AS ultima
          FROM contagem c JOIN escopo_item ei ON ei.id = c.escopo_item_id
          WHERE ei.empresa_id = ${empresaId}
          GROUP BY ei.produto_id
        )
        SELECT d.dias,
               COUNT(*) FILTER (WHERE u.ultima IS NOT NULL AND u.ultima >= now() - (d.dias || ' days')::interval)::bigint AS cobertos,
               (SELECT COUNT(*) FROM catalogo)::bigint AS total
        FROM (VALUES (30), (90), (365)) AS d(dias)
        LEFT JOIN catalogo cat ON true
        LEFT JOIN ultimas u ON u.produto_id = cat.id
        GROUP BY d.dias
        ORDER BY d.dias
      `);

      const nuncaInventariados = await this.prisma.$queryRaw<{ id: number; sku: string; nome: string }[]>(Prisma.sql`
        SELECT p.id, p.sku, p.nome
        FROM produto p
        WHERE ${whereProduto}
          AND NOT EXISTS (
            SELECT 1 FROM escopo_item ei WHERE ei.produto_id = p.id AND ei.empresa_id = ${empresaId}
          )
        ORDER BY p.nome ASC
      `);

      const produtividade = await this.prisma.$queryRaw<
        { usuario_id: number; nome: string; total_contagens: bigint; primeira: Date; ultima: Date }[]
      >(Prisma.sql`
        SELECT u.id AS usuario_id, u.nome, COUNT(*)::bigint AS total_contagens, MIN(c.contado_em) AS primeira, MAX(c.contado_em) AS ultima
        FROM contagem c
        JOIN usuario u ON u.id = c.contado_por
        WHERE c.empresa_id = ${empresaId}
        GROUP BY u.id, u.nome
        ORDER BY total_contagens DESC
      `);
      const produtividadePorOperador = produtividade.map((p) => {
        const horas = Math.max(1, (p.ultima.getTime() - p.primeira.getTime()) / 3600000);
        return {
          usuarioId: p.usuario_id,
          nome: p.nome,
          totalContagens: Number(p.total_contagens),
          contagensPorHora: Number(p.total_contagens) / horas,
        };
      });

      const tempoMedio = await this.prisma.$queryRaw<{ media_horas: number | null }[]>(Prisma.sql`
        SELECT AVG(EXTRACT(EPOCH FROM (e.efetivado_em - e.aberto_em)) / 3600)::float8 AS media_horas
        FROM escopo_inventario e
        WHERE e.status = 'EFETIVADO' AND e.aberto_em IS NOT NULL AND e.efetivado_em IS NOT NULL AND ${whereEscopo}
      `);

      return {
        escoposAbertos,
        cobertura: cobertura.map((c) => ({
          dias: c.dias,
          cobertos: Number(c.cobertos),
          total: Number(c.total),
          percentual: Number(c.total) > 0 ? (Number(c.cobertos) / Number(c.total)) * 100 : 0,
        })),
        itensNuncaInventariados: nuncaInventariados,
        produtividadePorOperador,
        tempoMedioAberturaEfetivacaoHoras: tempoMedio[0]?.media_horas ?? null,
      };
    });
  }
}
