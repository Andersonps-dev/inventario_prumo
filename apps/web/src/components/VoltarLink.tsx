import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function VoltarLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
      <ArrowLeft size={14} aria-hidden />
      {label}
    </Link>
  );
}
