import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

export class CriarEnderecoDto {
  @IsInt()
  depositoId!: number;

  @IsString()
  @MinLength(1)
  setor!: string;

  @IsString()
  @MinLength(1)
  rua!: string;

  @IsString()
  @MinLength(1)
  modulo!: string;

  @IsString()
  @MinLength(1)
  nivel!: string;

  @IsString()
  @MinLength(1)
  vao!: string;
}

export class AtualizarEnderecoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  setor?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  rua?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  modulo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  nivel?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  vao?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class SegmentoFaixaDto {
  @IsIn(['fixo', 'faixa'])
  tipo!: 'fixo' | 'faixa';

  @IsOptional()
  @IsString()
  valor?: string;

  @IsOptional()
  @IsString()
  inicio?: string;

  @IsOptional()
  @IsString()
  fim?: string;

  @IsOptional()
  @IsInt()
  passo?: number;
}

export class GerarFaixaDto {
  @IsInt()
  depositoId!: number;

  @ValidateNested()
  @Type(() => SegmentoFaixaDto)
  setor!: SegmentoFaixaDto;

  @ValidateNested()
  @Type(() => SegmentoFaixaDto)
  rua!: SegmentoFaixaDto;

  @ValidateNested()
  @Type(() => SegmentoFaixaDto)
  modulo!: SegmentoFaixaDto;

  @ValidateNested()
  @Type(() => SegmentoFaixaDto)
  nivel!: SegmentoFaixaDto;

  @ValidateNested()
  @Type(() => SegmentoFaixaDto)
  vao!: SegmentoFaixaDto;
}

export class ListarEnderecosQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  depositoId?: number;

  @IsOptional()
  @IsString()
  busca?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ativo?: boolean;
}
