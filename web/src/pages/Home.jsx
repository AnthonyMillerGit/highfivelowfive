import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();

  return (
    <AppShell>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Your lists
      </p>
      <h1 className="mt-2 font-display text-4xl font-extrabold">
        Nothing ranked yet
      </h1>

      {/* An empty screen is an invitation to act, so it says what to do next
          rather than apologising for being empty. */}
      <div className="mt-10 max-w-xl rounded-lg border border-dashed border-wire p-8">
        <p className="leading-relaxed text-muted">
          A list is any group of things in an order you're willing to defend.
          Five favorites, three worst, four faces on a mountain — the shape is
          up to you.
        </p>
        <p className="mt-4 font-mono text-xs text-muted">
          Signed in as {user.email} · list building lands next
        </p>
      </div>
    </AppShell>
  );
}
