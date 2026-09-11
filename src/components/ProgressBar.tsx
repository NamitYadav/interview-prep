export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={Math.max(1, max)}
      aria-valuetext={`${value} of ${max}`}
      className="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800"
    >
      <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}
