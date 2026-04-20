/**
 * Human-friendly relative time used across activity feeds, profile cards, and
 * freshness indicators. Negative deltas (future dates) render as "in Xs/m/h/d".
 */
export function formatRelative(iso: string | Date): string {
  const then = iso instanceof Date ? iso.getTime() : new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const diffMs = Date.now() - then;
  const future = diffMs < 0;
  const sec = Math.round(Math.abs(diffMs) / 1000);
  const render = (value: string) => (future ? `in ${value}` : `${value} ago`);
  if (sec < 60) return render(`${sec}s`);
  const min = Math.round(sec / 60);
  if (min < 60) return render(`${min}m`);
  const hr = Math.round(min / 60);
  if (hr < 24) return render(`${hr}h`);
  const day = Math.round(hr / 24);
  if (day < 14) return render(`${day}d`);
  const wk = Math.round(day / 7);
  if (wk < 8) return render(`${wk}w`);
  const mo = Math.round(day / 30);
  return render(`${mo}mo`);
}
