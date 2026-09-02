
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
/**
 * One editable row.
 *
 * The caller decides what the row's marker means and where it can move, so the
 * same row works in a flat list (move within the whole list) and in a tier
 * list (move within your tier, or change tier from the dropdown).
 */
export default function ItemRow({
  item, marker, groups, onChange, onRelabel,
  canUp, canDown, onUp, onDown, onRemove, canRemove,
}) {
  return (
    <li className="flex items-start gap-3 border-b border-wire py-3">
      {groups ? (
        // In a tier list the marker is the decision, not a label — so it is a
        // control. Re-tiering is the main thing people do after typing.
        <select
          value={item.label ?? groups[0]}
          onChange={(e) => onRelabel(item.key, e.target.value)}
          aria-label="Tier"
          className="mt-1.5 w-12 shrink-0 rounded border border-wire bg-ink px-1 py-1
                     text-center font-mono text-xs text-chalk
                     hover:border-muted/60 focus:border-high focus:outline-none"
        >
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      ) : (
        <span className="mt-2.5 w-12 shrink-0 truncate font-mono text-xs tabular-nums text-muted">
          {marker}
        </span>
      )}

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
        <IconButton label="Move up" onClick={onUp} disabled={!canUp}>
          {arrow("18 15 12 9 6 15")}
        </IconButton>
        <IconButton label="Move down" onClick={onDown} disabled={!canDown}>
          {arrow("6 9 12 15 18 9")}
        </IconButton>
        <IconButton label="Remove item" onClick={() => onRemove(item.key)} disabled={!canRemove}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </IconButton>
      </div>
    </li>
  );
}
