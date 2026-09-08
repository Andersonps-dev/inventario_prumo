import { ConflictException } from '@nestjs/common';
import { StatusEscopo } from '@prisma/client';

const TRANSICOES: Record<StatusEscopo, StatusEscopo[]> = {
  RASCUNHO: ['ABERTO', 'CANCELADO'],
  ABERTO: ['EM_CONTAGEM', 'CANCELADO'],
  EM_CONTAGEM: ['CONFERENCIA', 'CANCELADO'],
  CONFERENCIA: ['EM_CONTAGEM', 'EFETIVADO', 'CANCELADO'],
  EFETIVADO: [],
  CANCELADO: [],
};

export function validarTransicao(atual: StatusEscopo, destino: StatusEscopo) {
  if (!TRANSICOES[atual].includes(destino)) {
    throw new ConflictException(`Transição inválida: ${atual} → ${destino}.`);
  }
}

export const ESTADOS_ATIVOS: StatusEscopo[] = ['RASCUNHO', 'ABERTO', 'EM_CONTAGEM', 'CONFERENCIA'];
