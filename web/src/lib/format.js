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

/**
 * How a row is marked, in priority order: its own label if a template gave it
 * one ("1994", "C", "Prequel"), else its rank number if the order is a
 * ranking, else a bullet because the items are equals.
 *
 * This is the only place that decision is made.
 */
export function marker(isRanked, rank, label) {
  if (label) return label;
  return isRanked ? String(rank).padStart(2, "0") : "•";
}

/** "just now" / "12m" / "3h" / "Yesterday" / "Aug 30, 2026".
 *  Comments are usually recent, so exact timestamps are noise — but anything
 *  older than a week is better shown as a date than as "43d". */
export function relativeTime(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;

  return fullDate(iso);
}
