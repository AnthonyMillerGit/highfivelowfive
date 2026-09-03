import { useRef, useState } from "react";
import { marker } from "../lib/format";
import Field from "./Field";
import Button from "./Button";
import Alert from "./Alert";
import ItemRow from "./ItemRow";
import TierGroups from "./TierGroups";

const MAX_ITEMS = 100;

/** A row the form can edit. Seeds coming from a template carry only a label;
 *  seeds coming from a saved list carry a title and a note as well. */
const blank = (key, row = {}) => ({
  key,
  label: row.label ?? null,
  title: row.title ?? "",
  note: row.note ?? "",
});

/**
 * The list form, shared by writing a new list and editing an existing one.
 *
 * Both do the same thing to the same material — rows in an order, a title, and
 * whether that order means anything — so they are one component rather than
 * two that slowly disagree. What differs is only where the opening rows come
 * from (a template, or a list already saved) and what happens on submit.
 *
 * `shape` is whatever resolveTemplate returns: rows, whether it starts ranked,
 * a placeholder, and for a tier list the groups its rows are gathered under.
 */
export default function Builder({
  shape,
  initialTitle = "",
  initialDescription = "",
  eyebrow,
  heading,
  action,
  submitLabel,
  onSubmit,
  children,
}) {
  // Rows need identities that survive reordering. Using the array index as a
  // React key would make the inputs lose focus and swap values mid-typing when
  // rows move, so every row carries a key that never changes.
  const nextKey = useRef(shape.rows.length);
  const [items, setItems] = useState(() =>
    shape.rows.map((row, i) => blank(i, row))
  );

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [isRanked, setIsRanked] = useState(shape.ranked);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function updateItem(key, field, value) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, [field]: value } : it))
    );
  }

  /** Swap two rows by their position in the flat array. Callers work out
   *  which two — in a tier list that is the neighbour inside the same tier,
   *  which is not the neighbour in the array. */
  function swap(a, b) {
    setItems((prev) => {
      if (a < 0 || b < 0 || a >= prev.length || b >= prev.length) return prev;
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  }

  /** Move a row to a different tier. */
  function relabel(key, label) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, label } : it)));
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function addItem(label = null) {
    setItems((prev) => [...prev, blank(nextKey.current++, { label })]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Rows can be re-tiered in any order, so group them before saving. Rank
    // then runs cleanly down the tiers instead of zig-zagging between them.
    const ordered = shape.groups
      ? [...items].sort(
          (a, b) => shape.groups.indexOf(a.label) - shape.groups.indexOf(b.label)
        )
      : items;

    // Trailing blank rows are the normal way people leave a builder, so drop
    // them rather than making the server reject the whole list.
    const filled = ordered
      .map((it) => ({
        title: it.title.trim(),
        note: it.note.trim(),
        label: it.label,
      }))
      .filter((it) => it.title !== "");

    if (!title.trim()) return setError("Give the list a title.");
    if (filled.length === 0) return setError("Add at least one item.");

    setPending(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        is_ranked: isRanked,
        items: filled.map((it) => ({
          title: it.title,
          note: it.note || null,
          label: it.label,
        })),
      });
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          {eyebrow}
        </p>
        {action}
      </div>
      <h1 className="mt-2 font-display text-3xl font-extrabold">{heading}</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
        <Alert>{error}</Alert>

        <Field
          label="Title"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={shape.titlePlaceholder}
        />

        <Field
          label="Description"
          value={description}
          maxLength={2000}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional. Set up the argument."
        />

        {/* The one structural choice a list makes about itself. */}
        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Does the order matter?
          </legend>
          <div className="mt-1 flex gap-2">
            {[
              { on: true, label: "Ranked", hint: "1, 2, 3…" },
              { on: false, label: "Unranked", hint: "All equals" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setIsRanked(opt.on)}
                aria-pressed={isRanked === opt.on}
                className={`flex flex-col items-start gap-0.5 rounded-md border px-4 py-2.5 transition-colors ${
                  isRanked === opt.on
                    ? "border-high bg-high/10"
                    : "border-wire hover:border-muted/60"
                }`}
              >
                <span
                  className={`font-display text-[13px] font-bold ${
                    isRanked === opt.on ? "text-high" : "text-chalk"
                  }`}
                >
                  {opt.label}
                </span>
                <span className="font-mono text-[10px] text-muted">{opt.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Items
            </span>
            <span className="font-mono text-[11px] text-muted">
              {items.filter((i) => i.title.trim()).length} filled
            </span>
          </div>

          {shape.groups ? (
            <TierGroups
              groups={shape.groups}
              items={items}
              onChange={updateItem}
              onRelabel={relabel}
              onSwap={swap}
              onRemove={removeItem}
              onAdd={addItem}
              full={items.length >= MAX_ITEMS}
            />
          ) : (
            <>
              <ol className="mt-2 border-t border-wire">
                {items.map((item, i) => (
                  <ItemRow
                    key={item.key}
                    item={item}
                    marker={marker(isRanked, i + 1, item.label)}
                    onChange={updateItem}
                    canUp={i > 0}
                    canDown={i < items.length - 1}
                    onUp={() => swap(i, i - 1)}
                    onDown={() => swap(i, i + 1)}
                    onRemove={removeItem}
                    canRemove={items.length > 1}
                  />
                ))}
              </ol>

              <button
                type="button"
                onClick={() => addItem()}
                disabled={items.length >= MAX_ITEMS}
                className="mt-4 w-full rounded-md border border-dashed border-wire py-2.5
                           font-display text-[13px] font-bold text-muted transition-colors
                           hover:border-muted/60 hover:text-chalk disabled:opacity-40"
              >
                Add item
              </button>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <div className="w-48">
            <Button pending={pending}>{submitLabel}</Button>
          </div>
        </div>
      </form>

      {children}
    </>
  );
}
