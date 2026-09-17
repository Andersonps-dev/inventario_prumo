import { Module } from '@nestjs/common';
import { EntradasController } from './entradas.controller';
import { EntradasService } from './entradas.service';
import { DepositosModule } from '../depositos/depositos.module';
import { EstoqueModule } from '../estoque/estoque.module';

@Module({
  imports: [DepositosModule, EstoqueModule],
  controllers: [EntradasController],
  providers: [EntradasService],
})
export class EntradasModule {}
