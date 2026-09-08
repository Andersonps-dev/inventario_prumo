import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class SolicitarExportacaoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  produtoId?: number;

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
  @Type(() => Number)
  @IsInt()
  eventoVendaId?: number;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
