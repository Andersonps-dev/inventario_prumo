import { Injectable } from '@nestjs/common';

const TTL_MS = 5 * 60 * 1000;

interface Entrada {
  valor: unknown;
  expiraEm: number;
}

/**
 * Cache em memória dos agregados do dashboard (seção 7.4: "cache dos
 * agregados com recálculo ao efetivar"). Suficiente para o porte do
 * Prumo — sem depender de Redis. `invalidar()` é chamado ao final de
 * uma efetivação bem-sucedida.
 */
@Injectable()
export class DashboardCacheService {
  private readonly entradas = new Map<string, Entrada>();

  async comCache<T>(chave: string, calcular: () => Promise<T>): Promise<T> {
    const existente = this.entradas.get(chave);
    if (existente && existente.expiraEm > Date.now()) {
      return existente.valor as T;
    }
    const valor = await calcular();
    this.entradas.set(chave, { valor, expiraEm: Date.now() + TTL_MS });
    return valor;
  }

  invalidar() {
    this.entradas.clear();
  }
}
