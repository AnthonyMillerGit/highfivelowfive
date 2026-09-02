import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MAX_ITEMS } from "../lib/templates";

/**
 * The escape hatch: any length, ranked or not. Everything the fixed templates
 * decide for you, you decide here — so a "best movies by year" list with
 * twenty-five entries is one step rather than twenty-two clicks of Add item.
 */
export default function CustomTemplateCard() {
  const navigate = useNavigate();
  const [count, setCount] = useState(5);
  const [ranked, setRanked] = useState(true);

  const clamp = (n) => Math.min(Math.max(n, 1), MAX_ITEMS);

  return (
    <div className="flex flex-col rounded-lg border border-dashed border-wire bg-raised p-5">
      <span className="font-display text-lg font-bold text-chalk">Your own shape</span>
      <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        Any length, your call
      </span>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Fewer items"
            onClick={() => setCount((n) => clamp(n - 1))}
            className="h-7 w-7 rounded border border-wire text-muted transition-colors hover:border-muted/60 hover:text-chalk"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={MAX_ITEMS}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            onBlur={(e) => setCount(clamp(Number.parseInt(e.target.value, 10) || 1))}
            aria-label="How many items"
            className="w-14 rounded border border-wire bg-ink py-1 text-center font-mono text-sm
                       text-chalk focus:border-high focus:outline-none
                       [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            aria-label="More items"
            onClick={() => setCount((n) => clamp(n + 1))}
            className="h-7 w-7 rounded border border-wire text-muted transition-colors hover:border-muted/60 hover:text-chalk"
          >
            +
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            items
          </span>
        </div>

        <div className="flex gap-1.5">
          {[
            { on: true, label: "Ranked" },
            { on: false, label: "Unranked" },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setRanked(opt.on)}
              aria-pressed={ranked === opt.on}
              className={`rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                ranked === opt.on
                  ? "bg-high/15 text-high"
                  : "text-muted hover:text-chalk"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          navigate(`/new?template=custom&count=${clamp(Number(count) || 1)}&ranked=${ranked ? 1 : 0}`)
        }
        className="mt-auto pt-4 text-left font-display text-[13px] font-bold text-high transition-colors hover:text-high/80"
      >
        Start building →
      </button>
    </div>
  );
}
