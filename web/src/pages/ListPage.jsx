import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { fullDate, marker } from "../lib/format";
import AppShell from "../components/AppShell";
import Spinner from "../components/Spinner";

export default function ListPage() {
  const { username, slug } = useParams();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Reset on navigation, or moving between two lists would briefly show the
    // previous one's items under the new one's title.
    setList(null);
    setError("");
    api(`/api/users/${username}/lists/${slug}`)
      .then(setList)
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

  if (!list) {
    return (
      <AppShell>
        <Spinner />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link
        to={`/u/${list.author.username}`}
        className="flex items-center gap-3 rounded-sm"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-wire bg-raised font-display text-[17px] font-extrabold text-high">
          {list.author.username[0].toUpperCase()}
        </span>
        <span className="flex flex-col gap-0.5">
          {list.author.display_name && (
            <span className="font-display text-[15px] font-bold text-chalk">
              {list.author.display_name}
            </span>
          )}
          <span className="font-mono text-xs text-muted">@{list.author.username}</span>
        </span>
      </Link>

      <h1 className="mt-7 font-display text-4xl font-extrabold leading-[1.12]">
        {list.title}
      </h1>

      {list.description && (
        <p className="mt-3.5 text-base leading-relaxed text-chalk">{list.description}</p>
      )}

      <div className="mt-4 flex gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        <span>{list.is_ranked ? "Ranked" : "Unranked"}</span>
        <span>&middot;</span>
        <span>
          {list.item_count} {list.item_count === 1 ? "item" : "items"}
        </span>
        <span>&middot;</span>
        <span>{fullDate(list.created_at)}</span>
      </div>

      <ol className="mt-8 flex flex-col border-t border-wire">
        {list.items.map((item) => (
          <li key={item.id} className="flex gap-5 border-b border-wire py-[18px]">
            <span
              className={`w-8 shrink-0 font-mono text-xl font-bold tabular-nums ${
                list.is_ranked && item.rank === 1 ? "text-high" : "text-muted"
              }`}
            >
              {marker(list.is_ranked, item.rank)}
            </span>
            <span className="flex flex-col gap-1.5">
              <span className="font-display text-xl font-bold text-chalk">
                {item.title}
              </span>
              {item.note && (
                <span className="text-sm leading-relaxed text-muted">{item.note}</span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {/* Comments land in the next step; the count is already real. */}
      <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        {list.comment_count} {list.comment_count === 1 ? "comment" : "comments"}
      </p>
    </AppShell>
  );
}
