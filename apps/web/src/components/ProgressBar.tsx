export function ProgressBar({ percentual }: { percentual: number }) {
  const clamped = Math.max(0, Math.min(100, percentual));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-nevoa/20">
      <div className="h-full rounded-full bg-latao transition-all" style={{ width: `${clamped}%` }} />
    </div>
  );
}
