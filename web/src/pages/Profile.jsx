import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import ListCard from "../components/ListCard";
import Spinner from "../components/Spinner";
import Monogram from "../components/Monogram";
import FollowButton from "../components/FollowButton";
import PinToggle from "../components/PinToggle";
import Alert from "../components/Alert";

/** How many an author may pin. The server owns the rule; this is only what the
 *  page says out loud while there is still room. */
const MAX_PINNED = 3;

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
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (!username) return;
    setProfile(null);
    setLists(null);
    setError("");
    setPinError("");

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

  // Pinning changes the order of the whole page, and the order is the
  // server's answer — pinned first by when they were pinned, then the rest
  // newest first. Re-asking is one request and cannot drift; rebuilding that
  // sort by hand here could.
  async function refreshLists() {
    setLists(await api(`/api/users/${username}/lists`));
  }

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

  // The server already sorted pinned-first, so the split is a partition, not
  // a re-sort: the pinned ones are exactly the run at the front.
  const pinned = lists.filter((l) => l.pinned);
  const rest = lists.filter((l) => !l.pinned);

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
          <div className="mt-2 flex gap-7">
            {[
              [profile.list_count, profile.list_count === 1 ? "List" : "Lists"],
              [profile.follower_count, profile.follower_count === 1 ? "Follower" : "Followers"],
              [profile.following_count, "Following"],
            ].map(([count, label]) => (
              <div key={label} className="flex items-baseline gap-1.5">
                <span className="font-mono text-[15px] font-bold text-chalk">{count}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Only shown to a signed-in visitor looking at somebody else. */}
        {user && !profile.is_self && (
          <FollowButton
            username={profile.username}
            following={profile.is_following}
            onChange={(following) =>
              setProfile((prev) => ({
                ...prev,
                is_following: following,
                follower_count: prev.follower_count + (following ? 1 : -1),
              }))
            }
          />
        )}
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
          {pinError && (
            <div className="mt-12 max-w-xl">
              <Alert>{pinError}</Alert>
            </div>
          )}

          {/* The shelf. Three across on a wide screen, so a full one reads as
              a deliberate row rather than the top of the pile. */}
          {pinned.length > 0 && (
            <>
              <SectionHeading
                title="Pinned"
                note={
                  isOwn
                    ? `${pinned.length} of ${MAX_PINNED}`
                    : `${profile.display_name ?? "@" + profile.username} leads with these`
                }
              />
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {pinned.map((list) => (
                  <PinnableCard
                    key={list.id}
                    list={list}
                    isOwn={isOwn}
                    highlight
                    onChange={refreshLists}
                    onError={setPinError}
                  />
                ))}
              </div>
            </>
          )}

          <SectionHeading
            title={pinned.length > 0 ? "Everything else" : "Lists"}
            note="Newest first"
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {rest.map((list) => (
              <PinnableCard
                key={list.id}
                list={list}
                isOwn={isOwn}
                onChange={refreshLists}
                onError={setPinError}
              />
            ))}
          </div>

          {rest.length === 0 && (
            <p className="mt-6 max-w-xl leading-relaxed text-muted">
              {isOwn
                ? "Everything you have written is pinned. Write another and it lands here."
                : "Nothing beyond the pinned ones yet."}
            </p>
          )}
        </>
      )}
    </AppShell>
  );
}

function SectionHeading({ title, note }) {
  return (
    <div className="mt-12 flex items-baseline justify-between gap-4 border-b border-wire pb-3.5">
      <h2 className="font-display text-lg font-extrabold text-chalk">{title}</h2>
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {note}
      </span>
    </div>
  );
}

/**
 * A card, plus the pin control when the card is yours.
 *
 * The toggle is a sibling of the card rather than a child of it: the card is
 * one big link, and a button inside a link is neither valid nor clickable in
 * the way people expect. Sitting on top of it in the same box avoids that
 * entirely.
 */
function PinnableCard({ list, isOwn, highlight, onChange, onError }) {
  return (
    <div className="relative h-full">
      <ListCard list={list} highlight={highlight} />
      {isOwn && (
        <div className="absolute right-3 top-3">
          <PinToggle list={list} onChange={onChange} onError={onError} />
        </div>
      )}
    </div>
  );
}
