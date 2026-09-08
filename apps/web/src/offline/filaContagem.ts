import { ApiError } from '../api/client';

const NOME_BANCO = 'prumo-offline';
const NOME_STORE = 'contagens-pendentes';

export interface ContagemPendente {
  id?: number;
  escopoId: number;
  escopoItemId: number;
  quantidade: number;
  sku: string;
  nomeProduto: string;
  criadoEm: string;
}

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(NOME_BANCO, 1);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(NOME_STORE)) {
        db.createObjectStore(NOME_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

export async function enfileirarContagem(item: Omit<ContagemPendente, 'id'>): Promise<void> {
  const db = await abrirBanco();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(NOME_STORE, 'readwrite');
    tx.objectStore(NOME_STORE).add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listarPendentes(): Promise<ContagemPendente[]> {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOME_STORE, 'readonly');
    const pedido = tx.objectStore(NOME_STORE).getAll();
    pedido.onsuccess = () => resolve(pedido.result as ContagemPendente[]);
    pedido.onerror = () => reject(pedido.error);
  });
}

async function removerPendente(id: number): Promise<void> {
  const db = await abrirBanco();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(NOME_STORE, 'readwrite');
    tx.objectStore(NOME_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface ResultadoSincronizacao {
  sincronizados: number;
  /** Itens que o backend recusou de propósito (não é falha de rede) — foram
   * removidos da fila porque reenviar de novo nunca ia funcionar; o
   * chamador precisa avisar o usuário pra recontar. */
  falharam: ContagemPendente[];
}

/**
 * Reenvia a fila em ordem. Distingue os dois tipos de falha:
 * - `ApiError` (o backend respondeu e recusou — item cancelado, regra de
 *   negócio, etc.): não adianta reenviar, então remove da fila e reporta em
 *   `falharam` em vez de travar o resto atrás dela pra sempre.
 * - Qualquer outro erro (rede fora do ar): para aqui, mantém a ordem e os
 *   itens restantes na fila pra tentar de novo na próxima reconexão.
 */
export async function sincronizarFila(enviar: (item: ContagemPendente) => Promise<void>): Promise<ResultadoSincronizacao> {
  const pendentes = await listarPendentes();
  let sincronizados = 0;
  const falharam: ContagemPendente[] = [];
  for (const item of pendentes) {
    try {
      await enviar(item);
      if (item.id !== undefined) await removerPendente(item.id);
      sincronizados++;
    } catch (e) {
      if (e instanceof ApiError) {
        if (item.id !== undefined) await removerPendente(item.id);
        falharam.push(item);
        continue;
      }
      break;
    }
  }
  return { sincronizados, falharam };
}
