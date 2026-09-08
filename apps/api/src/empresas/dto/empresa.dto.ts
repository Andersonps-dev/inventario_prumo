import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CriarEmpresaDto {
  @IsString()
  @MinLength(1)
  nome!: string;
}

export class AtualizarEmpresaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nome?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
