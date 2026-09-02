import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MAX_ITEMS } from "../lib/templates";

const clamp = (n, lo = 1, hi = MAX_ITEMS) => Math.min(Math.max(n, lo), hi);

/** Shared frame so every card reads the same however different its controls. */
function Shell({ name, hint, children, onStart, dashed = false }) {
  return (
    <div
      className={`flex flex-col rounded-lg border bg-raised p-5 transition-colors
                  hover:border-high/60 ${dashed ? "border-dashed border-wire" : "border-wire"}`}
    >
      <span className="font-display text-lg font-bold text-chalk">{name}</span>
      <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {hint}
      </span>
      <div className="mt-4 grow">{children}</div>
      <button
        type="button"
        onClick={onStart}
        className="mt-4 text-left font-display text-[13px] font-bold text-high transition-colors hover:text-high/80"
      >
        Start building &rarr;
      </button>
    </div>
  );
}

/** Rows drawn as bars, marked the way the real list will be. */
export function ShapePreview({ marks, ranked }) {
  const shown = marks.slice(0, 5);
  const extra = marks.length - shown.length;

  return (
    <div className="flex flex-col gap-[5px]" aria-hidden="true">
      {shown.map((mark, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-7 shrink-0 truncate font-mono text-[9px] tabular-nums text-muted">
            {mark}
          </span>
          <span
            className={`h-[5px] rounded-full ${
              ranked && i === 0 ? "bg-high/70" : "bg-wire"
            }`}
            style={{ width: `${70 - i * 9}%` }}
          />
        </div>
      ))}
      {extra > 0 && (
        <span className="mt-0.5 pl-9 font-mono text-[9px] text-muted">+{extra} more</span>
      )}
    </div>
  );
}

const numbered = (count, ranked) =>
  Array.from({ length: count }, (_, i) =>
    ranked ? String(i + 1).padStart(2, "0") : "•"
  );

/* ------------------------------------------------------------ numbered */

export function NumberedCard() {
  const navigate = useNavigate();
  const [count, setCount] = useState(5);
  const [ranked, setRanked] = useState(true);

  return (
    <Shell
      name="Numbered list"
      hint="Top three, five, ten — any number"
      onStart={() => navigate(`/new?template=numbered&count=${clamp(Number(count) || 1)}&ranked=${ranked ? 1 : 0}`)}
    >
      <div className="flex flex-wrap gap-1.5">
        {[3, 5, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCount(n)}
            className={`rounded px-2.5 py-1 font-mono text-[11px] transition-colors ${
              Number(count) === n ? "bg-high/15 text-high" : "text-muted hover:text-chalk"
            }`}
          >
            Top {n}
          </button>
        ))}
        <input
          type="number"
          min={1}
          max={MAX_ITEMS}
          value={count}
          aria-label="How many items"
          onChange={(e) => setCount(e.target.value)}
          onBlur={(e) => setCount(clamp(Number.parseInt(e.target.value, 10) || 1))}
          className="w-12 rounded border border-wire bg-ink py-1 text-center font-mono text-[11px]
                     text-chalk focus:border-high focus:outline-none
                     [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <div className="mt-2 flex gap-1.5">
        {[{ on: true, label: "Ranked" }, { on: false, label: "Unranked" }].map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => setRanked(o.on)}
            aria-pressed={ranked === o.on}
            className={`rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
              ranked === o.on ? "bg-high/15 text-high" : "text-muted hover:text-chalk"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <ShapePreview marks={numbered(clamp(Number(count) || 1), ranked)} ranked={ranked} />
      </div>
    </Shell>
  );
}

/* ---------------------------------------------------------------- year */

export function YearCard() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(2025);
  const [to, setTo] = useState(2016);

  const step = Number(from) >= Number(to) ? -1 : 1;
  const span = Math.min(Math.abs(Number(from) - Number(to)) + 1 || 1, MAX_ITEMS);
  const marks = Array.from({ length: span }, (_, i) => String(Number(from) + i * step));

  const box =
    "w-16 rounded border border-wire bg-ink py-1 text-center font-mono text-[11px] text-chalk " +
    "focus:border-high focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <Shell
      name="Year by year"
      hint="A row for each year"
      onStart={() => navigate(`/new?template=year&from=${Number(from) || 2025}&to=${Number(to) || 2016}`)}
    >
      <div className="flex items-center gap-2">
        <input type="number" value={from} aria-label="From year"
               onChange={(e) => setFrom(e.target.value)} className={box} />
        <span className="font-mono text-[11px] text-muted">to</span>
        <input type="number" value={to} aria-label="To year"
               onChange={(e) => setTo(e.target.value)} className={box} />
        <span className="font-mono text-[10px] text-muted">{span} rows</span>
      </div>
      <div className="mt-4">
        <ShapePreview marks={marks} ranked={false} />
      </div>
    </Shell>
  );
}

/* -------------------------------------------------------------- labels */

export function LabelsCard() {
  const navigate = useNavigate();
  const [text, setText] = useState("Original\nPrequel\nSequel");

  const marks = text.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <Shell
      name="Your own labels"
      hint="One per line — you name the rows"
      dashed
      onStart={() => navigate(`/new?template=labels&labels=${encodeURIComponent(text)}`)}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        aria-label="Row labels, one per line"
        className="w-full resize-y rounded border border-wire bg-ink px-2 py-1.5 font-mono
                   text-[11px] leading-relaxed text-chalk focus:border-high focus:outline-none"
      />
      <div className="mt-3">
        <ShapePreview marks={marks.length ? marks : ["•", "•", "•"]} ranked={false} />
      </div>
    </Shell>
  );
}

/* -------------------------------------------------------------- simple */

export function SimpleCard({ id, name, hint, marks }) {
  const navigate = useNavigate();
  return (
    <Shell name={name} hint={hint} onStart={() => navigate(`/new?template=${id}`)}>
      <ShapePreview marks={marks} ranked={false} />
    </Shell>
  );
}
