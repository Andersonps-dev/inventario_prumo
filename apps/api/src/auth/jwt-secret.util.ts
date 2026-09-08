import { ConfigService } from '@nestjs/config';

const VALOR_INSEGURO_CONHECIDO = 'troque-este-segredo-em-producao';

/**
 * Nunca cai num default hardcoded — um segredo previsível permite forjar
 * qualquer token (inclusive SUPER_ADMIN) sem nenhuma senha. Falha o boot
 * em vez de subir "funcionando" com uma porta escancarada.
 */
export function obterJwtSecretObrigatorio(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret || secret === VALOR_INSEGURO_CONHECIDO) {
    throw new Error(
      'JWT_SECRET ausente ou com o valor padrão inseguro. Defina uma string aleatória própria em apps/api/.env antes de iniciar.',
    );
  }
  return secret;
}
