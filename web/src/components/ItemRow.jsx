import { marker } from "../lib/format";

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded border border-wire text-muted
                 transition-colors hover:border-muted/60 hover:text-chalk
                 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-wire
                 disabled:hover:text-muted"
    >
      {children}
    </button>
  );
}

const arrow = (points) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points={points} />
  </svg>
);

/** One editable row in the builder. Reordering is buttons rather than drag and
 *  drop: it needs no library, works from the keyboard, and is announced to
 *  screen readers — drag would be none of those without real work. */
export default function ItemRow({
  item, index, total, isRanked, onChange, onMove, onRemove,
}) {
  return (
    <li className="flex items-start gap-3 border-b border-wire py-3">
      <span className="mt-2.5 w-7 shrink-0 font-mono text-xs tabular-nums text-muted">
        {marker(isRanked, index + 1)}
      </span>

      <div className="flex grow flex-col gap-2">
        <input
          value={item.title}
          onChange={(e) => onChange(item.key, "title", e.target.value)}
          placeholder="Name the thing"
          maxLength={200}
          className="w-full rounded-md border border-wire bg-ink px-3 py-2 text-chalk
                     placeholder:text-muted/50 transition-colors
                     hover:border-muted/60 focus:border-high focus:outline-none"
        />
        <input
          value={item.note}
          onChange={(e) => onChange(item.key, "note", e.target.value)}
          placeholder="Why this one? (optional)"
          maxLength={1000}
          className="w-full rounded-md border border-transparent bg-transparent px-3 py-1.5
                     text-sm text-muted placeholder:text-muted/50 transition-colors
                     hover:border-wire focus:border-high focus:text-chalk focus:outline-none"
        />
      </div>

      <div className="mt-1 flex shrink-0 gap-1.5">
        <IconButton label="Move up" onClick={() => onMove(index, -1)} disabled={index === 0}>
          {arrow("18 15 12 9 6 15")}
        </IconButton>
        <IconButton label="Move down" onClick={() => onMove(index, 1)} disabled={index === total - 1}>
          {arrow("6 9 12 15 18 9")}
        </IconButton>
        <IconButton label="Remove item" onClick={() => onRemove(item.key)} disabled={total === 1}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </IconButton>
      </div>
    </li>
  );
}
