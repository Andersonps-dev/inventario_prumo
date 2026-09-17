import { Module } from '@nestjs/common';
import { TransferenciasController } from './transferencias.controller';
import { TransferenciasService } from './transferencias.service';
import { DepositosModule } from '../depositos/depositos.module';
import { EstoqueModule } from '../estoque/estoque.module';

@Module({
  imports: [DepositosModule, EstoqueModule],
  controllers: [TransferenciasController],
  providers: [TransferenciasService],
})
export class TransferenciasModule {}
