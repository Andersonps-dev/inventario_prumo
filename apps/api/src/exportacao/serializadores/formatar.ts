export function formatarValor(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toLocaleString('pt-BR');
  if (typeof v === 'number') return v.toString().replace('.', ',');
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  return String(v);
}
