import { Module } from '@nestjs/common';
import { EventosVendaController } from './eventos-venda.controller';
import { EventosVendaService } from './eventos-venda.service';
import { DepositosModule } from '../depositos/depositos.module';
import { EnderecosModule } from '../enderecos/enderecos.module';
import { EstoqueModule } from '../estoque/estoque.module';

@Module({
  imports: [DepositosModule, EnderecosModule, EstoqueModule],
  controllers: [EventosVendaController],
  providers: [EventosVendaService],
})
export class EventosVendaModule {}
