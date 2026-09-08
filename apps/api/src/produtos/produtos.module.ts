import { Module } from '@nestjs/common';
import { ProdutosController } from './produtos.controller';
import { ProdutosService } from './produtos.service';
import { ProdutosImportService } from './import/produtos-import.service';

@Module({
  controllers: [ProdutosController],
  providers: [ProdutosService, ProdutosImportService],
  exports: [ProdutosService],
})
export class ProdutosModule {}
