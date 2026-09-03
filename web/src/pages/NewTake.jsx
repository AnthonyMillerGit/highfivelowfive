import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { shapeOf } from "../lib/shape";
import AppShell from "../components/AppShell";
import Builder from "../components/Builder";
import Spinner from "../components/Spinner";

/**
 * Your answer to someone else's list.
 *
 * The origin sets the question and you fill in the answer, so the form opens
 * on the origin's shape with every row empty. What you cannot do is change the
 * shape: a take on a top five is a top five. That is enforced on the server —
 * this only keeps the form from offering what would be refused.
 */
export default function NewTake() {
  const { username, slug } = useParams();
  const [origin, setOrigin] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setOrigin(null);
    setError("");
    api(`/api/users/${username}/lists/${slug}`)
      .then(setOrigin)
      .catch((err) => setError(err.message));
  }, [username, slug]);

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

  if (!origin) {
    return (
      <AppShell>
        <Spinner />
      </AppShell>
    );
  }

  return <TakeForm origin={origin} />;
}

function TakeForm({ origin }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const shape = shapeOf(origin, { blank: true });

  return (
    <AppShell>
      <Builder
        shape={shape}
        initialTitle={origin.title}
        // Tiers stay open — a tier holds as much as you put in it. Every other
        // kind of list has the rows it has.
        fixedRows={!shape.groups}
        eyebrow={`A take on @${origin.author.username}'s list`}
        heading={origin.title}
        submitLabel="Publish your take"
        action={
          <Link
            to={`/u/${origin.author.username}/${origin.slug}`}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-chalk"
          >
            Cancel
          </Link>
        }
        onSubmit={async (body) => {
          const created = await api(`/api/lists/${origin.id}/takes`, {
            method: "POST",
            body,
          });
          navigate(`/u/${user.username}/${created.slug}`, { replace: true });
        }}
      />
    </AppShell>
  );
}
