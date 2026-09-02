/** "SEP 2" — compact stamp for list cards. */
export function cardDate(iso) {
  return new Date(iso)
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

/** "Aug 30, 2026" — full stamp for a list page. */
export function fullDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Ranked lists number their items; unranked ones are equals, so they get
 *  bullets. This is the only place that distinction is rendered. */
export function marker(isRanked, rank) {
  return isRanked ? String(rank).padStart(2, "0") : "•";
}
