import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class FiltrosRelatorioDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  depositoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  escopoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  enderecoId?: number;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
