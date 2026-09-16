export function ProgressBar({ percentual }: { percentual: number }) {
  const clamped = Math.max(0, Math.min(100, percentual));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stroke">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${clamped}%` }} />
    </div>
  );
}
