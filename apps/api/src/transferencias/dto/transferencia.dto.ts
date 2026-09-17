import { IsInt, IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

export class CriarTransferenciaDto {
  @IsInt()
  depositoId!: number;

  @IsInt()
  enderecoOrigemId!: number;

  @IsInt()
  enderecoDestinoId!: number;
}

// Cada bipagem é uma chamada com um produto só — soma à quantidade já
// bipada desse produto na transferência, mesma lógica de "cada bipe soma"
// já usada na contagem de inventário e no grêmio.
export class BipagemTransferenciaDto {
  @IsInt()
  produtoId!: number;

  @IsNumber()
  @IsPositive()
  quantidade!: number;
}

export class MotivoTransferenciaDto {
  @IsString()
  @MinLength(3)
  motivo!: string;
}
