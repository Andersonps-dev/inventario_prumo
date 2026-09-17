import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsPositive, IsString, MinLength, ValidateNested } from 'class-validator';

export class CriarEntradaDto {
  @IsString()
  @MinLength(1)
  nota!: string;

  @IsInt()
  depositoId!: number;
}

// Cada bipagem é uma chamada com um produto só — soma à quantidade já
// recebida desse produto, mesma lógica de "cada bipe soma" já usada na
// contagem de inventário, no grêmio e na transferência.
export class BipagemEntradaDto {
  @IsInt()
  produtoId!: number;

  @IsNumber()
  @IsPositive()
  quantidade!: number;
}

export class ItemDistribuicaoDto {
  @IsInt()
  produtoId!: number;

  @IsNumber()
  @IsPositive()
  quantidade!: number;
}

// Distribui vários produtos de uma vez pra uma única posição — a tela
// permite marcar "todo mundo, com toda a quantidade restante" numa
// tacada só, então a chamada já entra com a lista inteira.
export class DistribuirEntradaDto {
  @IsInt()
  enderecoId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemDistribuicaoDto)
  itens!: ItemDistribuicaoDto[];
}

export class MotivoEntradaDto {
  @IsString()
  @MinLength(3)
  motivo!: string;
}
