import { Card } from '../Card';

export function StatCard({
  rotulo,
  valor,
  destaque,
  aoClicar,
}: {
  rotulo: string;
  valor: string | number;
  destaque?: 'positivo' | 'negativo' | 'neutro';
  aoClicar?: () => void;
}) {
  const cor = destaque === 'negativo' ? 'text-danger' : destaque === 'positivo' ? 'text-success' : 'text-ink';
  const Tag = aoClicar ? 'button' : 'div';
  return (
    <Card
      as={Tag}
      onClick={aoClicar}
      padding="p-3"
      className={`text-left ${aoClicar ? 'cursor-pointer transition-colors hover:border-primary/50' : ''}`}
    >
      <div className="text-xs text-muted">{rotulo}</div>
      <div className={`text-lg font-semibold ${cor}`}>{valor}</div>
    </Card>
  );
}
