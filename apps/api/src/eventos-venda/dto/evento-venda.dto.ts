import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, MinLength, ValidateNested } from 'class-validator';

// `enderecoId` sempre se refere a uma posição do depósito de origem da
// feira — o endereço de onde tirar (ao levar) ou pra onde devolver (ao
// retornar). O depósito virtual não tem posições reais, só um sentinela
// (resolvido no service), então nunca aparece aqui.
export class ItemComPosicaoDto {
  @IsInt()
  produtoId!: number;

  @IsInt()
  enderecoId!: number;

  @IsNumber()
  @IsPositive()
  quantidade!: number;
}

export class CriarEventoVendaDto {
  @IsString()
  @MinLength(1)
  titulo!: string;

  @IsOptional()
  @IsDateString()
  dataEvento?: string;

  @IsInt()
  depositoOrigemId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemComPosicaoDto)
  itens!: ItemComPosicaoDto[];
}

export class AtualizarEventoVendaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  titulo?: string;

  @IsOptional()
  @IsDateString()
  dataEvento?: string;
}

export class AdicionarItensEventoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemComPosicaoDto)
  itens!: ItemComPosicaoDto[];
}

export class RegistrarRetornoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemComPosicaoDto)
  itens!: ItemComPosicaoDto[];
}
