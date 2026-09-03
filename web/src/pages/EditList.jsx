import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import Builder from "../components/Builder";
import Spinner from "../components/Spinner";
import Alert from "../components/Alert";

/**
 * Turn a saved list back into the shape the builder opens with.
 *
 * A tier list is recognised the same way the list page recognises one: a label
 * used by more than one row is a group heading. That rule lives in the data
 * rather than in a column, so reading it back has to ask the same question.
 */
function shapeOf(list) {
  const counts = {};
  for (const item of list.items) {
    if (item.label) counts[item.label] = (counts[item.label] ?? 0) + 1;
  }
  const grouped = Object.values(counts).some((n) => n > 1);

  // A grouped list is drawn tier by tier, and a tier only shows the rows whose
  // label matches it exactly. So an unlabelled row in an otherwise grouped
  // list has to be given a group to sit in, or it would be invisible in the
  // form and quietly disappear when saved. It gets the blank one, alongside
  // every other row that never had a label. The server trims it back to null.
  const groupOf = (item) => (grouped ? item.label ?? "" : item.label);

  return {
    ranked: list.is_ranked,
    titlePlaceholder: list.title,
    rows: list.items.map((item) => ({
      label: groupOf(item),
      title: item.title,
      note: item.note ?? "",
    })),
    // Tiers in the order they were saved in, which is the order they were
    // published in. A tier nobody put anything in was dropped on the way in,
    // so it does not come back.
    groups: grouped ? [...new Set(list.items.map(groupOf))] : null,
  };
}

export default function EditList() {
  const { username, slug } = useParams();
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setList(null);
    setError("");
    api(`/api/users/${username}/lists/${slug}`)
      .then(setList)
      .catch((err) => setError(err.message));
  }, [username, slug]);

  // Editing is only ever your own. The API enforces this too — this just keeps
  // the app from offering a form that could never save.
  if (user && user.username !== username) {
    return <Navigate to={`/u/${username}/${slug}`} replace />;
  }

  if (error) {
    return (
      <AppShell>
        <h1 className="font-display text-3xl font-extrabold">Nothing here</h1>
        <p className="mt-3 text-muted">{error}</p>
        <Link to="/" className="mt-6 inline-block text-high underline underline-offset-4">
          Back to your lists
        </Link>
      </AppShell>
    );
  }

  if (!list) {
    return (
      <AppShell>
        <Spinner />
      </AppShell>
    );
  }

  return <EditForm list={list} />;
}

function EditForm({ list }) {
  const navigate = useNavigate();

  return (
    <AppShell>
      <Builder
        shape={shapeOf(list)}
        initialTitle={list.title}
        initialDescription={list.description ?? ""}
        eyebrow="Editing"
        heading="Change your mind"
        submitLabel="Save changes"
        action={
          <Link
            to={`/u/${list.author.username}/${list.slug}`}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-chalk"
          >
            Cancel
          </Link>
        }
        onSubmit={async (body) => {
          await api(`/api/lists/${list.id}`, { method: "PATCH", body });
          // The slug never moves, so the list is still where it was.
          navigate(`/u/${list.author.username}/${list.slug}`, { replace: true });
        }}
      >
        <DangerZone list={list} onDeleted={() => navigate("/", { replace: true })} />
      </Builder>
    </AppShell>
  );
}

/**
 * Deleting asks twice, in place.
 *
 * A native confirm() would do the job, but it freezes the page behind a dialog
 * the app cannot style or dismiss. Two clicks in the interface itself is the
 * same protection and stays in the app's own voice.
 */
function DangerZone({ list, onDeleted }) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function destroy() {
    setError("");
    setPending(true);
    try {
      await api(`/api/lists/${list.id}`, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  return (
    <div className="mt-14 border-t border-wire pt-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        Delete this list
      </p>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}

      {!armed ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-md text-sm leading-relaxed text-muted">
            The list, its items and every comment on it go too. There is no
            undo.
          </p>
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="shrink-0 rounded-md border border-low/50 px-4 py-2 font-display
                       text-[13px] font-bold text-low transition-colors hover:bg-low/10"
          >
            Delete list
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-md border border-low/40 bg-low/5 p-4">
          <p className="max-w-md text-sm leading-relaxed text-chalk">
            Delete <span className="font-bold">{list.title}</span> and its{" "}
            {list.comment_count}{" "}
            {list.comment_count === 1 ? "comment" : "comments"}? This cannot be
            undone.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setArmed(false)}
              disabled={pending}
              className="rounded-md border border-wire px-4 py-2 font-display text-[13px]
                         font-bold text-muted transition-colors hover:text-chalk
                         disabled:opacity-40"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={destroy}
              disabled={pending}
              className="rounded-md bg-low px-4 py-2 font-display text-[13px] font-bold
                         text-ink transition-colors hover:bg-low/85 disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Delete for good"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
