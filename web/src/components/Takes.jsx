import { useEffect, useState } from "react";
import { api } from "../lib/api";
import AuthoredCard from "./AuthoredCard";
import Spinner from "./Spinner";

/**
 * Everyone else's answer to this list.
 *
 * Shown rather than hidden behind a click: the whole point of a take is that
 * the argument is the page, and burying the other answers one tap down would
 * make the original look like the only one. Nothing is fetched when there are
 * none, so an unanswered list costs no request.
 */
export default function Takes({ listId, count }) {
  const [takes, setTakes] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!count) {
      setTakes(null);
      return;
    }
    setTakes(null);
    setError("");
    api(`/api/lists/${listId}/takes`)
      .then(setTakes)
      .catch((err) => setError(err.message));
  }, [listId, count]);

  if (!count) return null;

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between gap-4 border-b border-wire pb-3.5">
        <h2 className="font-display text-lg font-extrabold text-chalk">
          {count} {count === 1 ? "take" : "takes"}
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Same shape, different answers
        </span>
      </div>

      {error && <p className="mt-6 text-sm text-low">{error}</p>}
      {!takes && !error && (
        <div className="mt-6">
          <Spinner />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-7">
        {takes?.map((take) => (
          <AuthoredCard key={take.id} list={take} verb="answered it with" />
        ))}
      </div>
    </section>
  );
}
