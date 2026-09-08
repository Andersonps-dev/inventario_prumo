import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuditoriaModule } from './common/auditoria/auditoria.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EmpresasModule } from './empresas/empresas.module';
import { DepositosModule } from './depositos/depositos.module';
import { ProdutosModule } from './produtos/produtos.module';
import { EstoqueModule } from './estoque/estoque.module';
import { EscoposModule } from './escopos/escopos.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExportacaoModule } from './exportacao/exportacao.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { EnderecosModule } from './enderecos/enderecos.module';
import { EventosVendaModule } from './eventos-venda/eventos-venda.module';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Padrão global generoso (protege contra abuso bruto); /auth/login usa
    // um limite bem mais apertado via @Throttle() no próprio controller.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuditoriaModule,
    AuthModule,
    UsuariosModule,
    EmpresasModule,
    DepositosModule,
    ProdutosModule,
    EstoqueModule,
    EscoposModule,
    DashboardModule,
    ExportacaoModule,
    RelatoriosModule,
    EnderecosModule,
    EventosVendaModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
