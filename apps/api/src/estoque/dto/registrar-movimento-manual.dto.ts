import { IsIn, IsInt, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class RegistrarMovimentoManualDto {
  @IsInt()
  produtoId!: number;

  @IsOptional()
  @IsInt()
  depositoId?: number;

  @IsOptional()
  @IsInt()
  enderecoId?: number;

  @IsIn(['ENTRADA', 'SAIDA'])
  tipo!: 'ENTRADA' | 'SAIDA';

  @IsNumber()
  quantidade!: number;

  @IsString()
  @MinLength(3)
  motivo!: string;
}
