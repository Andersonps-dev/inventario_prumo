import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

interface LinhaDivergencia {
  empresa_id: number;
  produto_id: number;
  deposito_id: number;
  endereco_id: number;
  saldo_cache: number;
  saldo_calculado: number;
}

/**
 * Job de conferência (regra 8.7): compara saldo_estoque (cache) com a soma
 * de movimento_estoque (fonte da verdade) e loga qualquer divergência.
 * Comparação por produto+depósito+endereço, já que o saldo agora é
 * granular por endereço.
 */
@Injectable()
export class ConferenciaSaldoJob {
  private readonly logger = new Logger(ConferenciaSaldoJob.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async executar() {
    const divergencias = await this.prisma.$queryRaw<LinhaDivergencia[]>`
      SELECT s.empresa_id, s.produto_id, s.deposito_id, s.endereco_id, s.quantidade::float8 AS saldo_cache,
             COALESCE(SUM(m.quantidade), 0)::float8 AS saldo_calculado
      FROM saldo_estoque s
      LEFT JOIN movimento_estoque m
        ON m.produto_id = s.produto_id AND m.deposito_id = s.deposito_id AND m.endereco_id = s.endereco_id
      GROUP BY s.empresa_id, s.produto_id, s.deposito_id, s.endereco_id, s.quantidade
      HAVING s.quantidade <> COALESCE(SUM(m.quantidade), 0)
    `;

    if (divergencias.length === 0) {
      this.logger.log('Conferência de saldo: nenhuma divergência encontrada.');
      return divergencias;
    }

    this.logger.warn(`Conferência de saldo: ${divergencias.length} divergência(s) de cache encontrada(s).`);
    for (const d of divergencias) {
      this.logger.warn(
        `empresa ${d.empresa_id} / produto ${d.produto_id} / depósito ${d.deposito_id} / endereço ${d.endereco_id}: cache=${d.saldo_cache} calculado=${d.saldo_calculado}`,
      );
    }
    return divergencias;
  }
}
