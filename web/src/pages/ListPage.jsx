import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { fullDate, marker } from "../lib/format";
import AppShell from "../components/AppShell";
import Spinner from "../components/Spinner";
import Comments from "../components/Comments";
import Monogram from "../components/Monogram";

export default function ListPage() {
  const { username, slug } = useParams();
  const { user } = useAuth();
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

  // A label used more than once is a group heading — several things share a
  // tier. A label used once is the row's own name, like a year, and reads
  // better inline. The data tells us which without another column.
  const counts = list.items.reduce((acc, i) => {
    if (i.label) acc[i.label] = (acc[i.label] ?? 0) + 1;
    return acc;
  }, {});
  const grouped = Object.values(counts).some((n) => n > 1);

  return (
    <AppShell>
      <Link
        to={`/u/${list.author.username}`}
        className="flex items-center gap-3 rounded-sm"
      >
        <Monogram username={list.author.username} size="md" />
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

      {/* Only the author is offered the edit; the API refuses anyone else
          regardless, so this is about not showing a door that is locked. */}
      {user?.username === list.author.username && (
        <Link
          to={`/u/${list.author.username}/${list.slug}/edit`}
          className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.16em]
                     text-muted underline decoration-wire underline-offset-4
                     transition-colors hover:text-high hover:decoration-high"
        >
          Edit list
        </Link>
      )}

      {grouped ? <GroupedItems list={list} /> : <FlatItems list={list} />}

      <Comments listId={list.id} />
    </AppShell>
  );
}

/** Ordinary rows: marker on the left, item on the right. */
function FlatItems({ list }) {
  return (
    <ol className="mt-8 flex flex-col border-t border-wire">
      {list.items.map((item) => (
        <li key={item.id} className="flex gap-5 border-b border-wire py-[18px]">
          <span
            className={`w-16 shrink-0 font-mono text-xl font-bold tabular-nums ${
              list.is_ranked && item.rank === 1 ? "text-high" : "text-muted"
            }`}
          >
            {marker(list.is_ranked, item.rank, item.label)}
          </span>
          <span className="flex flex-col gap-1.5">
            <span className="font-display text-xl font-bold text-chalk">{item.title}</span>
            {item.note && (
              <span className="text-sm leading-relaxed text-muted">{item.note}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A tier list: the label is a heading and everything under it belongs to it. */
function GroupedItems({ list }) {
  const order = [];
  const byLabel = new Map();

  for (const item of list.items) {
    const key = item.label ?? "";
    if (!byLabel.has(key)) {
      byLabel.set(key, []);
      order.push(key);
    }
    byLabel.get(key).push(item);
  }

  return (
    <div className="mt-8 flex flex-col gap-px">
      {order.map((label) => (
        <div key={label} className="flex gap-5 border-t border-wire py-5">
          <span className="w-16 shrink-0 font-display text-2xl font-extrabold text-high">
            {label || "—"}
          </span>
          <ul className="flex grow flex-col gap-2.5">
            {byLabel.get(label).map((item) => (
              <li key={item.id} className="flex flex-col gap-1">
                <span className="font-display text-lg font-bold text-chalk">
                  {item.title}
                </span>
                {item.note && (
                  <span className="text-sm leading-relaxed text-muted">{item.note}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
