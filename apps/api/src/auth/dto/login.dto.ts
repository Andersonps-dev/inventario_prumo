import { IsEmail, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  // Espaço colado junto com o e-mail (comum ao copiar de outro lugar) faz
  // @IsEmail rejeitar um endereço válido — trim antes de validar.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  senha!: string;
}
