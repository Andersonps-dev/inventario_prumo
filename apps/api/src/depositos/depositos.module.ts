import { Module } from '@nestjs/common';
import { DepositosController } from './depositos.controller';
import { DepositosService } from './depositos.service';
import { EnderecosModule } from '../enderecos/enderecos.module';

@Module({
  imports: [EnderecosModule],
  controllers: [DepositosController],
  providers: [DepositosService],
  exports: [DepositosService],
})
export class DepositosModule {}
