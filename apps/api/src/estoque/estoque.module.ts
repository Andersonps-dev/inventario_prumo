import { Module } from '@nestjs/common';
import { EstoqueController } from './estoque.controller';
import { EstoqueService } from './estoque.service';
import { ConferenciaSaldoJob } from './conferencia-saldo.job';
import { DepositosModule } from '../depositos/depositos.module';
import { EnderecosModule } from '../enderecos/enderecos.module';

@Module({
  imports: [DepositosModule, EnderecosModule],
  controllers: [EstoqueController],
  providers: [EstoqueService, ConferenciaSaldoJob],
  exports: [EstoqueService],
})
export class EstoqueModule {}
