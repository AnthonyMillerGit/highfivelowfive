import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { resolveTemplate } from "../lib/templates";
import AppShell from "../components/AppShell";
import Field from "../components/Field";
import Button from "../components/Button";
import Alert from "../components/Alert";
import ItemRow from "../components/ItemRow";
import {
  NumberedCard,
  YearCard,
  LabelsCard,
  SimpleCard,
} from "../components/TemplateCard";

const blank = (key, label = null) => ({ key, label, title: "", note: "" });

/**
 * Two steps: pick a shape, then fill it in.
 *
 * The template lives in the URL rather than in component state so the back
 * button returns to the chooser, and so a half-built list survives a reload
 * landing on the right shape.
 */
export default function NewList() {
  const [params] = useSearchParams();
  const id = params.get("template");

  if (!id) return <TemplateChooser />;

  const template = resolveTemplate(id, params);

  // Keyed on the resolved shape so switching rebuilds the form from scratch
  // rather than trying to reconcile a ten-row list into a four-row one.
  return <Builder key={params.toString()} template={template} />;
}

function TemplateChooser() {
  return (
    <AppShell wide>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">New list</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold">Pick a shape</h1>
      <p className="mt-3 max-w-lg leading-relaxed text-muted">
        A starting point, not a rule. Add rows, remove them, or change your mind
        about the order once you are in.
      </p>

      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NumberedCard />
        <SimpleCard
          id="rushmore"
          name="Mount Rushmore"
          hint="Four faces, no order"
          marks={["•", "•", "•", "•"]}
        />
        <YearCard />
        <SimpleCard
          id="tier"
          name="Tier list"
          hint="S down to F"
          marks={["S", "A", "B", "C", "D", "F"]}
        />
        <LabelsCard />
      </div>
    </AppShell>
  );
}

function Builder({ template }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Rows need identities that survive reordering. Using the array index as a
  // React key would make the inputs lose focus and swap values mid-typing when
  // rows move, so every row carries a key that never changes.
  const nextKey = useRef(template.rows.length);
  const [items, setItems] = useState(() =>
    template.rows.map((row, i) => blank(i, row.label))
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isRanked, setIsRanked] = useState(template.ranked);
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
        label: it.label,
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
          items: filled.map((it) => ({
            title: it.title,
            note: it.note || null,
            label: it.label,
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
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          {template.name}
        </p>
        <Link
          to="/new"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-chalk"
        >
          Change shape
        </Link>
      </div>
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
          placeholder={template.titlePlaceholder}
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

          <ol className="mt-2 border-t border-wire">
            {items.map((item, i) => (
              <ItemRow
                key={item.key}
                item={item}
                index={i}
                total={items.length}
                isRanked={isRanked}
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
