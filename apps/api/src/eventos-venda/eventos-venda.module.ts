import { Module } from '@nestjs/common';
import { EventosVendaController } from './eventos-venda.controller';
import { EventosVendaService } from './eventos-venda.service';
import { DepositosModule } from '../depositos/depositos.module';
import { EstoqueModule } from '../estoque/estoque.module';

@Module({
  imports: [DepositosModule, EstoqueModule],
  controllers: [EventosVendaController],
  providers: [EventosVendaService],
})
export class EventosVendaModule {}
