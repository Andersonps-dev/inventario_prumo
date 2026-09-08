import { Module } from '@nestjs/common';
import { EscoposController } from './escopos.controller';
import { EscoposService } from './escopos.service';
import { EscopoSelecaoService } from './escopo-selecao.service';
import { EfetivacaoService } from './efetivacao.service';
import { ComprovanteService } from './comprovante.service';
import { EstoqueModule } from '../estoque/estoque.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [EstoqueModule, DashboardModule],
  controllers: [EscoposController],
  providers: [EscoposService, EscopoSelecaoService, EfetivacaoService, ComprovanteService],
})
export class EscoposModule {}
