import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { SHAPES } from "./ItemImage";

/**
 * Search a provider for a picture and pick one.
 *
 * Rendered inline under the item rather than as a modal: there is nothing to
 * trap focus against, and the row you are filling in stays visible while you
 * choose.
 */
export default function ImagePicker({ initialQuery, shape, onPick, onClose }) {
  const [sources, setSources] = useState(null);
  const [source, setSource] = useState(null);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | searching | error | done
  const [broken, setBroken] = useState(() => new Set());

  useEffect(() => {
    api("/api/image-sources")
      .then((list) => {
        setSources(list);
        setSource(list[0]?.name ?? null);
      })
      .catch(() => setSources([]));
  }, []);

  // Debounced: a search fires per pause in typing, not per keystroke. These are
  // free third-party services and every keystroke would be a request.
  const timer = useRef();
  useEffect(() => {
    if (!source) return;
    clearTimeout(timer.current);

    if (!query.trim()) {
      setResults([]);
      setStatus("idle");
      return;
    }

    setStatus("searching");
    timer.current = setTimeout(async () => {
      try {
        const found = await api(
          `/api/image-search?provider=${source}&q=${encodeURIComponent(query.trim())}`
        );
        setResults(found);
        setStatus("done");
      } catch {
        setStatus("error");
      }
    }, 400);

    return () => clearTimeout(timer.current);
  }, [query, source]);

  const ratio = SHAPES[shape]?.ratio ?? SHAPES.square.ratio;
  const visible = results.filter((r) => !broken.has(r.ref));

  return (
    <div className="mt-2 rounded-lg border border-wire bg-raised p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {sources?.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setSource(s.name)}
              className={`rounded font-mono text-[11px] uppercase tracking-[0.14em] px-2.5 py-1 transition-colors ${
                source === s.name
                  ? "bg-high/15 text-high"
                  : "text-muted hover:text-chalk"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-chalk"
        >
          Close
        </button>
      </div>

      {sources?.length === 0 && (
        <p className="mt-3 text-sm text-muted">No picture sources are configured.</p>
      )}

      {sources?.length > 0 && (
        <>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            className="mt-3 w-full rounded-md border border-wire bg-ink px-3 py-2 text-sm text-chalk
                       placeholder:text-muted/50 focus:border-high focus:outline-none"
          />

          <div className="mt-3 min-h-[40px]">
            {status === "searching" && (
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                Searching…
              </p>
            )}
            {status === "error" && (
              <p className="text-sm text-low">
                That source is not responding. Try again in a moment.
              </p>
            )}
            {status === "done" && visible.length === 0 && (
              <p className="text-sm text-muted">
                Nothing with a picture matched. Try a different spelling.
              </p>
            )}

            {visible.length > 0 && (
              <div className="grid grid-cols-6 gap-2.5">
                {visible.map((r) => (
                  <button
                    key={r.ref}
                    type="button"
                    title={`${r.title}${r.subtitle ? " — " + r.subtitle : ""}`}
                    onClick={() => onPick({ ...r, source })}
                    className="group flex flex-col gap-1.5 text-left"
                  >
                    <img
                      src={r.thumb_url}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      // Not every result actually has art behind its URL, so a
                      // tile that fails to load removes itself rather than
                      // sitting there broken.
                      onError={() =>
                        setBroken((prev) => new Set(prev).add(r.ref))
                      }
                      className={`w-full ${ratio} rounded border border-wire bg-ink object-cover
                                  transition-colors group-hover:border-high`}
                    />
                    <span className="truncate font-mono text-[10px] text-muted group-hover:text-chalk">
                      {r.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
