import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Papel } from '@prisma/client';

export class AtualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nome?: string;

  @IsOptional()
  @IsEnum(Papel)
  papel?: Papel;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
