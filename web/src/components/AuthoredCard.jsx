import { Link } from "react-router-dom";
import { relativeTime } from "../lib/format";
import Avatar from "./Avatar";
import ListCard from "./ListCard";

/**
 * A list card with the person who wrote it above it.
 *
 * Attribution sits outside the card rather than inside: the card is the list,
 * and this line is why the list is in front of you. That reason differs — the
 * feed is showing you what someone published, a takes list is showing you how
 * they answered — so the sentence is the only part that changes.
 */
export default function AuthoredCard({ list, verb }) {
  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
        <Avatar user={list.author} tone="muted" />
        <Link
          to={`/u/${list.author.username}`}
          className="font-mono text-xs text-chalk transition-colors hover:text-high"
        >
          @{list.author.username}
        </Link>
        <span className="text-sm text-muted">
          {verb ?? (list.origin ? "answered a list" : "published a list")}
        </span>
        <span className="font-mono text-[11px] text-muted">
          &middot; {relativeTime(list.created_at)}
        </span>
      </div>
      <ListCard list={list} />
    </div>
  );
}
