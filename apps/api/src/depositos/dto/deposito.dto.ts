import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CriarDepositoDto {
  @IsString()
  @MinLength(1)
  nome!: string;
}

export class AtualizarDepositoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nome?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
