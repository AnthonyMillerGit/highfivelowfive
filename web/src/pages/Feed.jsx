import { useEffect, useState } from "react";
import { api } from "../lib/api";
import AppShell from "../components/AppShell";
import AuthoredCard from "../components/AuthoredCard";
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
          <AuthoredCard
            key={list.id}
            list={list}
            verb={
              list.origin
                ? `took on @${list.origin.username}'s list`
                : "published a list"
            }
          />
        ))}
      </div>
    </AppShell>
  );
}
