import { Link } from "react-router-dom";

/** Draws the template's actual shape: numbered bars for a ranked list,
 *  dots for an unranked one. The picture is the explanation. */
function ShapePreview({ count, ranked }) {
  const rows = Math.min(count, 5);
  const truncated = count > rows;

  return (
    <div className="mt-4 flex flex-col gap-[5px]" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-4 shrink-0 font-mono text-[9px] tabular-nums text-muted">
            {ranked ? String(i + 1).padStart(2, "0") : "•"}
          </span>
          <span
            className={`h-[5px] rounded-full ${
              ranked && i === 0 ? "bg-high/70" : "bg-wire"
            }`}
            // Staggered widths so the preview reads as list rows rather than
            // a progress bar.
            style={{ width: `${72 - i * 9}%` }}
          />
        </div>
      ))}
      {truncated && (
        <span className="mt-0.5 pl-6 font-mono text-[9px] text-muted">
          +{count - rows} more
        </span>
      )}
    </div>
  );
}

export default function TemplateCard({ template }) {
  return (
    <Link
      to={`/new?template=${template.id}`}
      className="flex flex-col rounded-lg border border-wire bg-raised p-5 transition-colors hover:border-high/60"
    >
      <span className="font-display text-lg font-bold text-chalk">{template.name}</span>
      <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {template.hint}
      </span>
      <ShapePreview count={template.count} ranked={template.ranked} />
    </Link>
  );
}
