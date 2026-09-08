import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

// "   " (só espaço) passa em @MinLength(1) porque tem length > 0 — sem o
// trim antes, um nome/sku em branco visualmente é aceito como válido.
const aparado = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CriarProdutoDto {
  @aparado()
  @IsString()
  @MinLength(1)
  sku!: string;

  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @aparado()
  @IsString()
  @MinLength(1)
  nome!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  unidade?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precoCusto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estoqueMinimo?: number;
}

export class AtualizarProdutoDto {
  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @IsOptional()
  @aparado()
  @IsString()
  @MinLength(1)
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  unidade?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precoCusto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estoqueMinimo?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class ListarProdutosQueryDto {
  @IsOptional()
  @IsString()
  busca?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  abaixoDoMinimo?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tamanhoPagina?: number;
}
