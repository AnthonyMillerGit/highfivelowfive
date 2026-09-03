/**
 * Turn a saved list back into the shape a builder opens with.
 *
 * Two things need this and they want it slightly differently. Editing reopens
 * your own list with its answers intact. Taking on someone else's opens the
 * same shape with the answers stripped out — because the shape is the question
 * and the row titles are the answer.
 *
 * A tier list is recognised the way the list page recognises one: a label used
 * by more than one row is a group heading. That rule lives in the data rather
 * than in a column, so everywhere that reads it back has to ask the same
 * question.
 */
export function shapeOf(list, { blank = false } = {}) {
  const counts = {};
  for (const item of list.items) {
    if (item.label) counts[item.label] = (counts[item.label] ?? 0) + 1;
  }
  const grouped = Object.values(counts).some((n) => n > 1);

  // A grouped list is drawn tier by tier, and a tier only shows rows whose
  // label matches it exactly. So an unlabelled row in an otherwise grouped
  // list has to be given a group to sit in, or it would be invisible in the
  // form and quietly disappear when saved. The server trims it back to null.
  const groupOf = (item) => (grouped ? (item.label ?? "") : item.label);
  const groups = grouped ? [...new Set(list.items.map(groupOf))] : null;

  return {
    ranked: list.is_ranked,
    titlePlaceholder: list.title,
    groups,
    // A blank take on a tier list starts with one empty row per tier: the
    // tiers are what was asked, and how much goes in each is the taker's
    // business. Everywhere else the rows are the question, so they carry over
    // one for one — ten years means ten films.
    rows:
      blank && grouped
        ? groups.map((label) => ({ label, title: "", note: "" }))
        : list.items.map((item) => ({
            label: groupOf(item),
            title: blank ? "" : item.title,
            note: blank ? "" : (item.note ?? ""),
          })),
  };
}
