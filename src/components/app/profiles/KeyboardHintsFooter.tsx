interface KeyboardHintsFooterProps {
  visibleCount: number;
  totalCount: number;
}

const HINTS: Array<[string, string]> = [
  ["↑↓ / j k", "navigate"],
  ["s", "sync"],
  ["o", "open"],
  ["x", "select"],
  ["/", "search"],
  ["esc", "clear"],
];

export function KeyboardHintsFooter({
  visibleCount,
  totalCount,
}: KeyboardHintsFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 pt-2 text-[11px] text-muted-foreground">
      <span className="tabular-nums">
        Showing {visibleCount} of {totalCount}
      </span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {HINTS.map(([key, label]) => (
          <span key={key} className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted/40 px-1 py-px font-mono text-[10px] text-foreground/80">
              {key}
            </kbd>
            <span>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
