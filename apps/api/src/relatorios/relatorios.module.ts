import { Module } from '@nestjs/common';
import { RelatoriosController } from './relatorios.controller';
import { RelatoriosService } from './relatorios.service';
import { ComparacaoEstoqueService } from './comparacao-estoque.service';

@Module({
  controllers: [RelatoriosController],
  providers: [RelatoriosService, ComparacaoEstoqueService],
  exports: [RelatoriosService],
})
export class RelatoriosModule {}
