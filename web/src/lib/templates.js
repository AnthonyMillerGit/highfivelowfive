/**
 * A template is only a starting shape. It seeds the builder — how many rows,
 * whether order matters, what the title field suggests — and then gets out of
 * the way. Nothing here is stored or enforced: once the builder opens, every
 * choice is still the author's.
 */
export const TEMPLATES = [
  {
    id: "top5",
    name: "Top 5",
    hint: "The house format",
    count: 5,
    ranked: true,
    titlePlaceholder: "Top 5 horror movies that hold up",
  },
  {
    id: "top10",
    name: "Top 10",
    hint: "Room for the deep cuts",
    count: 10,
    ranked: true,
    titlePlaceholder: "Top 10 albums of the decade",
  },
  {
    id: "top3",
    name: "Top 3",
    hint: "Podium only",
    count: 3,
    ranked: true,
    titlePlaceholder: "Top 3 sandwiches in this city",
  },
  {
    id: "low5",
    name: "Low Five",
    hint: "The five worst, in order",
    count: 5,
    ranked: true,
    titlePlaceholder: "The 5 worst album closers of the 90s",
  },
  {
    id: "rushmore",
    name: "Mount Rushmore",
    hint: "Four faces, no order",
    count: 4,
    ranked: false,
    titlePlaceholder: "My Mount Rushmore of NBA centers",
  },
];

export const MAX_ITEMS = 100;

/** Clamp anything that arrives from the URL — a count comes in as text a
 *  person can edit, so it is never trusted as a number. */
export function customTemplate(count, ranked) {
  const n = Number.parseInt(count, 10);
  return {
    id: "custom",
    name: "Your own shape",
    hint: "You decide",
    count: Number.isFinite(n) ? Math.min(Math.max(n, 1), MAX_ITEMS) : 5,
    ranked,
    titlePlaceholder: "Best movies by year",
  };
}

export const templateById = (id) =>
  TEMPLATES.find((t) => t.id === id) ?? customTemplate(5, true);
