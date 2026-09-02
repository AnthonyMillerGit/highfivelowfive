import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import Field from "../components/Field";
import Button from "../components/Button";
import Alert from "../components/Alert";
import ItemRow from "../components/ItemRow";
import { SHAPES } from "../components/ItemImage";

const blank = (key) => ({ key, title: "", note: "", image: "" });

export default function NewList() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Rows need identities that survive reordering. Using the array index as a
  // React key would make the inputs lose focus and swap values mid-typing when
  // rows move, so every row carries a key that never changes.
  const nextKey = useRef(3);
  const [items, setItems] = useState([blank(0), blank(1), blank(2)]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRanked, setIsRanked] = useState(true);
  const [shape, setShape] = useState("square");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function updateItem(key, field, value) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, [field]: value } : it))
    );
  }

  function moveItem(index, delta) {
    setItems((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function addItem() {
    setItems((prev) => [...prev, blank(nextKey.current++)]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Trailing blank rows are the normal way people leave a builder, so drop
    // them rather than making the server reject the whole list.
    const filled = items
      .map((it) => ({
        title: it.title.trim(),
        note: it.note.trim(),
        image: it.image.trim(),
      }))
      .filter((it) => it.title !== "");

    if (!title.trim()) return setError("Give the list a title.");
    if (filled.length === 0) return setError("Add at least one item.");

    setPending(true);
    try {
      const created = await api("/api/lists", {
        method: "POST",
        body: {
          title: title.trim(),
          description: description.trim() || null,
          is_ranked: isRanked,
          image_shape: shape,
          items: filled.map((it) => ({
            title: it.title,
            note: it.note || null,
            image_url: it.image || null,
          })),
        },
      });
      navigate(`/u/${user.username}/${created.slug}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  return (
    <AppShell>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">New list</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold">
        What are we ranking?
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
        <Alert>{error}</Alert>

        <Field
          label="Title"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Top 5 horror movies that hold up"
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

        {/* Shape is a property of the list because a list is almost always one
            kind of thing — and mixed ratios make the rows impossible to read. */}
        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Picture shape
          </legend>
          <div className="mt-1 flex gap-2">
            {Object.entries(SHAPES).map(([key, s]) => (
              <button
                key={key}
                type="button"
                onClick={() => setShape(key)}
                aria-pressed={shape === key}
                className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 transition-colors ${
                  shape === key ? "border-high bg-high/10" : "border-wire hover:border-muted/60"
                }`}
              >
                <span
                  className={`w-5 ${s.ratio} rounded-[3px] border ${
                    shape === key ? "border-high/70 bg-high/20" : "border-muted/50"
                  }`}
                />
                <span className="flex flex-col items-start gap-0.5">
                  <span
                    className={`font-display text-[13px] font-bold ${
                      shape === key ? "text-high" : "text-chalk"
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="font-mono text-[10px] text-muted">{s.hint}</span>
                </span>
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

          <ol className="mt-2 border-t border-wire">
            {items.map((item, i) => (
              <ItemRow
                key={item.key}
                item={item}
                index={i}
                total={items.length}
                isRanked={isRanked}
                shape={shape}
                onChange={updateItem}
                onMove={moveItem}
                onRemove={removeItem}
              />
            ))}
          </ol>

          <button
            type="button"
            onClick={addItem}
            disabled={items.length >= 100}
            className="mt-4 w-full rounded-md border border-dashed border-wire py-2.5
                       font-display text-[13px] font-bold text-muted transition-colors
                       hover:border-muted/60 hover:text-chalk disabled:opacity-40"
          >
            Add item
          </button>
        </div>

        <div className="flex justify-end">
          <div className="w-48">
            <Button pending={pending}>Publish list</Button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
