export function paraJson(dados: unknown): Buffer {
  return Buffer.from(JSON.stringify(dados, null, 2), 'utf-8');
}
