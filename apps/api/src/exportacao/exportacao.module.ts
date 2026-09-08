import { Module } from '@nestjs/common';
import { ExportacaoController } from './exportacao.controller';
import { ExportacaoService } from './exportacao.service';
import { EstoqueModule } from '../estoque/estoque.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { RelatoriosModule } from '../relatorios/relatorios.module';

@Module({
  imports: [EstoqueModule, DashboardModule, RelatoriosModule],
  controllers: [ExportacaoController],
  providers: [ExportacaoService],
})
export class ExportacaoModule {}
