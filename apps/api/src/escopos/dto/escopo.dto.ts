import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export type TipoCriterioSelecao =
  | 'CATALOGO_INTEIRO'
  | 'CURVA_A_CUSTO'
  | 'NAO_CONTADOS_HA_N_DIAS'
  | 'LISTA_SKUS'
  | 'SELECAO_MANUAL'
  | 'POR_ENDERECO';

export class CriterioSelecaoDto {
  @IsIn([
    'CATALOGO_INTEIRO',
    'CURVA_A_CUSTO',
    'NAO_CONTADOS_HA_N_DIAS',
    'LISTA_SKUS',
    'SELECAO_MANUAL',
    'POR_ENDERECO',
  ])
  tipo!: TipoCriterioSelecao;

  @IsOptional()
  @IsNumber()
  valorMinimoCusto?: number;

  @IsOptional()
  @IsInt()
  dias?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skus?: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  produtoIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  enderecoIds?: number[];
}

export class CriarEscopoDto {
  @IsString()
  @MinLength(1)
  titulo!: string;

  @IsInt()
  depositoId!: number;

  @IsOptional()
  @IsInt()
  responsavelId?: number;

  @IsOptional()
  @IsDateString()
  prazo?: string;

  @IsOptional()
  @IsString()
  observacao?: string;

  @ValidateNested()
  @Type(() => CriterioSelecaoDto)
  criterio!: CriterioSelecaoDto;
}

export class AtualizarEscopoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  titulo?: string;

  @IsOptional()
  @IsInt()
  responsavelId?: number;

  @IsOptional()
  @IsDateString()
  prazo?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class AdicionarItensDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  produtoIds?: number[];

  /**
   * Quando informado junto de produtoIds, força os produtos para este
   * endereço específico, ignorando onde o sistema hoje registra saldo —
   * caso do produto encontrado fisicamente num endereço que ainda não
   * consta para ele.
   */
  @IsOptional()
  @IsInt()
  enderecoId?: number;

  /**
   * Alternativa a produtoIds: adiciona ao escopo todo produto com saldo
   * registrado nestes endereços — mesma resolução do critério POR_ENDERECO
   * usado na abertura do escopo, mas aplicável a um escopo já aberto.
   */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  enderecoIds?: number[];
}

export class MotivoDto {
  @IsString()
  @MinLength(3)
  motivo!: string;
}

export class RegistrarContagemDto {
  @IsInt()
  escopoItemId!: number;

  @IsNumber()
  quantidade!: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class EfetivarEscopoDto {
  @IsIn(['IGNORAR', 'ZERAR'])
  politicaPendentes!: 'IGNORAR' | 'ZERAR';
}
