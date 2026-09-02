export const MAX_ITEMS = 100;
export const MAX_TIERS = 12;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** S sits above A, then the alphabet runs on: S A B C, or S through I.
 *  How far it runs is the author's call. */
export function tierLabels(count) {
  const n = Math.min(Math.max(Number.parseInt(count, 10) || 6, 2), MAX_TIERS);
  return ["S", ...LETTERS.slice(0, n - 1).split("")];
}

const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const int = (v, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * A template resolves to a starting shape: how many rows, whether the order is
 * a ranking, and what each row is already called.
 *
 * The interesting ones are the labelled kinds. "Best film of each year" is not
 * a list of five things in order — it is a row per year, where the year is
 * fixed and the answer is what you fill in. So a template can hand back rows
 * that already know their own name.
 *
 * Everything arrives from the query string, which a person can edit, so every
 * value is parsed and clamped rather than trusted.
 */
export function resolveTemplate(id, params) {
  const get = (k, d) => params?.get(k) ?? d;

  switch (id) {
    case "rushmore":
      return {
        id,
        name: "Mount Rushmore",
        ranked: false,
        titlePlaceholder: "My Mount Rushmore of NBA centers",
        rows: Array.from({ length: 4 }, () => ({ label: null })),
      };

    case "year": {
      const from = clamp(int(get("from"), 2025), 1, 3000);
      const to = clamp(int(get("to"), 2016), 1, 3000);
      const step = from >= to ? -1 : 1;
      const span = Math.abs(from - to) + 1;

      const years = [];
      for (let i = 0; i < Math.min(span, MAX_ITEMS); i++) {
        years.push({ label: String(from + i * step) });
      }
      return {
        id,
        name: "Year by year",
        ranked: false,
        titlePlaceholder: "Best film of every year",
        rows: years,
      };
    }

    case "tier": {
      const tiers = tierLabels(get("tiers", 6));
      return {
        id,
        name: "Tier list",
        ranked: false,
        titlePlaceholder: "Every Zelda game, tiered",
        // A tier holds as many things as you put in it, so the label is a
        // group rather than a row. Each starts with one empty slot.
        rows: tiers.map((label) => ({ label })),
        // Present means "rows are grouped under these labels, and a row may
        // be moved between them".
        groups: tiers,
      };
    }

    case "labels": {
      // One label per line, which is how people naturally type a list of
      // categories. Blank lines are dropped rather than becoming empty rows.
      const lines = get("labels", "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, MAX_ITEMS);

      return {
        id,
        name: "Your own labels",
        ranked: false,
        titlePlaceholder: "Best of each era",
        rows: lines.length
          ? lines.map((label) => ({ label: label.slice(0, 40) }))
          : [{ label: null }, { label: null }, { label: null }],
      };
    }

    case "numbered":
    default: {
      const count = clamp(int(get("count"), 5), 1, MAX_ITEMS);
      return {
        id: "numbered",
        name: `Top ${count}`,
        ranked: get("ranked") !== "0",
        titlePlaceholder: `Top ${count} horror movies that hold up`,
        rows: Array.from({ length: count }, () => ({ label: null })),
      };
    }
  }
}
