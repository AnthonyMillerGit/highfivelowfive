import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { relativeTime } from "../lib/format";
import AppShell from "../components/AppShell";
import ListCard from "../components/ListCard";
import Monogram from "../components/Monogram";
import Spinner from "../components/Spinner";

export default function Feed() {
  const [lists, setLists] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/feed").then(setLists).catch((e) => setError(e.message));
  }, []);

  return (
    <AppShell>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        From the people you follow
      </p>
      <h1 className="mt-2 font-display text-4xl font-extrabold">Feed</h1>

      {error && <p className="mt-6 text-sm text-low">{error}</p>}
      {!lists && !error && (
        <div className="mt-8">
          <Spinner />
        </div>
      )}

      {lists?.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-wire p-8">
          <p className="leading-relaxed text-muted">
            Your feed fills up as you follow people. Open someone's profile and
            follow them, and their lists land here.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-7">
        {lists?.map((list) => (
          <div key={list.id}>
            {/* Attribution sits outside the card: the card is the list, this
                line is why the list is in front of you. */}
            <div className="mb-2.5 flex items-center gap-2.5">
              <Monogram username={list.author.username} tone="muted" />
              <Link
                to={`/u/${list.author.username}`}
                className="font-mono text-xs text-chalk transition-colors hover:text-high"
              >
                @{list.author.username}
              </Link>
              <span className="text-sm text-muted">published a list</span>
              <span className="font-mono text-[11px] text-muted">
                &middot; {relativeTime(list.created_at)}
              </span>
            </div>
            <ListCard list={list} />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
