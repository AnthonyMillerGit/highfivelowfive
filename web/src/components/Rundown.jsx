import { useEffect, useState } from "react";

// Deliberately opinionated placeholder rankings: the point of the animation is
// that reasonable people reorder these constantly.
const ENTRIES = [
  "Hot fuzz",
  "The Thing",
  "Point Break",
  "Heat",
  "Ronin",
];

/**
 * The signature element. A five-row ranked list where one adjacent pair swaps
 * every few seconds — the numbers hold still while the titles trade places.
 * It says the thing the product is about: a ranking is an argument in motion.
 */
export default function Rundown() {
  const [order, setOrder] = useState(ENTRIES);
  const [swapping, setSwapping] = useState(null); // index of the upper row

  useEffect(() => {
    // Respect the OS setting rather than only softening the animation.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let timeout;
    const interval = setInterval(() => {
      const i = Math.floor(Math.random() * (ENTRIES.length - 1));
      setSwapping(i);
      // Let the highlight land before the rows actually trade places.
      timeout = setTimeout(() => {
        setOrder((prev) => {
          const next = [...prev];
          [next[i], next[i + 1]] = [next[i + 1], next[i]];
          return next;
        });
        setSwapping(null);
      }, 420);
    }, 3600);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <ol className="space-y-px" aria-label="An example ranking, reordering itself">
      {order.map((title, i) => {
        const active = swapping === i || swapping === i - 1;
        return (
          <li
            key={title}
            className={`flex items-baseline gap-4 border-b border-wire/60 py-3 transition-colors duration-300 ${
              active ? "bg-high/10" : ""
            }`}
          >
            <span className="font-mono text-xs text-muted tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={`font-display text-lg font-bold transition-colors duration-300 ${
                active ? "text-high" : "text-chalk"
              }`}
            >
              {title}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
