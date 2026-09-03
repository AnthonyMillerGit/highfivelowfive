import { Link } from "react-router-dom";
import { cardDate, marker } from "../lib/format";
import CommentIcon from "./CommentIcon";

/** The card the profile grid and the feed both render. Whatever this shows is
 *  what GET /api/users/:username/lists has to return.
 *
 *  `highlight` is passed by the pinned shelf rather than read off list.pinned,
 *  so the card does not have to guess where it is being rendered — a pinned
 *  list showing up in a feed is just a list. */
export default function ListCard({ list, highlight = false }) {
  const remaining = list.item_count - list.preview.length;

  return (
    <Link
      to={`/u/${list.author.username}/${list.slug}`}
      className={`flex h-full flex-col rounded-lg border bg-raised p-6 transition-colors ${
        highlight
          ? "border-high/35 hover:border-high/60"
          : "border-wire hover:border-muted/60"
      }`}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        {list.is_ranked ? "Ranked" : "Unranked"} &middot; {list.item_count}{" "}
        {list.item_count === 1 ? "item" : "items"}
      </span>

      <h3 className="mt-2 font-display text-xl font-bold text-chalk">{list.title}</h3>

      <div className="mb-3.5 mt-4 flex flex-col">
        {list.preview.map((item, i) => (
          <div
            key={item.id}
            className={`flex items-baseline gap-3 py-[7px] ${
              i < list.preview.length - 1 || remaining > 0
                ? "border-b border-wire/60"
                : ""
            }`}
          >
            <span
              className={`w-9 shrink-0 truncate font-mono text-[11px] tabular-nums ${
                list.is_ranked && item.rank === 1 ? "text-high" : "text-muted"
              }`}
            >
              {marker(list.is_ranked, item.rank, item.label)}
            </span>
            <span className="text-sm text-chalk">{item.title}</span>
          </div>
        ))}
        {remaining > 0 && (
          <span className="pt-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            +{remaining} more
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-wire pt-3.5">
        <span className="flex items-center gap-2 text-muted">
          <CommentIcon />
          <span className="font-mono text-[11px]">{list.comment_count}</span>
        </span>
        <span className="font-mono text-[11px] tracking-[0.1em] text-muted">
          {cardDate(list.created_at)}
        </span>
      </div>
    </Link>
  );
}
