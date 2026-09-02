import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import ListCard from "../components/ListCard";
import Spinner from "../components/Spinner";
import Monogram from "../components/Monogram";

/** Serves both "/" (your own lists) and "/u/:username" (anyone's). One
 *  component because the page is the same page — only the empty state and the
 *  header actions differ. */
export default function Profile() {
  const { user } = useAuth();
  const params = useParams();
  const username = params.username ?? user?.username;
  const isOwn = user?.username === username;

  const [profile, setProfile] = useState(null);
  const [lists, setLists] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username) return;
    setProfile(null);
    setLists(null);
    setError("");

    // Both requests go out together rather than in sequence — they do not
    // depend on each other, so waiting for the first would just be slower.
    Promise.all([
      api(`/api/users/${username}`),
      api(`/api/users/${username}/lists`),
    ])
      .then(([p, l]) => {
        setProfile(p);
        setLists(l);
      })
      .catch((err) => setError(err.message));
  }, [username]);

  if (error) {
    return (
      <AppShell wide>
        <h1 className="font-display text-3xl font-extrabold">Nothing here</h1>
        <p className="mt-3 text-muted">{error}</p>
      </AppShell>
    );
  }

  if (!profile || !lists) {
    return (
      <AppShell wide>
        <Spinner />
      </AppShell>
    );
  }

  return (
    <AppShell wide>
      <div className="flex items-start gap-6">
        <Monogram username={profile.username} size="lg" />

        <div className="flex grow flex-col gap-2">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-3xl font-extrabold">
              {profile.display_name ?? `@${profile.username}`}
            </h1>
            {profile.display_name && (
              <span className="font-mono text-[13px] text-muted">@{profile.username}</span>
            )}
          </div>
          {profile.bio && (
            <p className="max-w-xl leading-relaxed text-chalk">{profile.bio}</p>
          )}
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-[15px] font-bold text-chalk">
              {profile.list_count}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              {profile.list_count === 1 ? "List" : "Lists"}
            </span>
          </div>
        </div>
      </div>

      {lists.length === 0 ? (
        <div className="mt-12 max-w-xl rounded-lg border border-dashed border-wire p-8">
          <p className="leading-relaxed text-muted">
            {isOwn
              ? "A list is any group of things in an order you're willing to defend. Five favorites, three worst, four faces on a mountain — the shape is up to you."
              : `@${profile.username} hasn't published a list yet.`}
          </p>
          {isOwn && (
            <Link
              to="/new"
              className="mt-5 inline-block rounded-md bg-high px-4 py-2.5 font-display text-[13px] font-bold text-ink transition-colors hover:bg-high/85"
            >
              Make your first list
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mt-12 flex items-center justify-end border-b border-wire pb-3.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              Newest first
            </span>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {lists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
