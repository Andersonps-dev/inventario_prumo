import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FiltrosAuditoriaDto {
  @IsOptional()
  @IsString()
  entidade?: string;

  @IsOptional()
  @IsString()
  acao?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  usuarioId?: number;

  /** Só usado pelo SUPER_ADMIN sem empresa selecionada — filtra dentre todas. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  empresaId?: number;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;
}
