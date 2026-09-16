import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  mensagem,
  icone: Icone = Inbox,
  rotuloAcao,
  onAcao,
}: {
  mensagem: string;
  icone?: LucideIcon;
  rotuloAcao?: string;
  onAcao?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Icone className="text-stroke" size={36} aria-hidden />
      <p className="text-sm text-muted">{mensagem}</p>
      {rotuloAcao && onAcao && (
        <Button variante="primaria" onClick={onAcao}>
          {rotuloAcao}
        </Button>
      )}
    </div>
  );
}
