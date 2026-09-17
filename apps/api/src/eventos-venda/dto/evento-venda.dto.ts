import { ArrayMinSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

// `enderecoId` sempre se refere a uma das posições habilitadas pro grêmio —
// de onde tirar (ao adicionar) ou pra onde devolver (ao registrar retorno).
// Cada bipagem é uma chamada com um item só, que soma à reserva existente
// desse (produto, endereço) no evento — mesma lógica de acumular por bipe já
// usada na contagem de inventário.
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
  @IsInt({ each: true })
  enderecoIds!: number[];
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

export class AdicionarPosicoesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  enderecoIds!: number[];
}
