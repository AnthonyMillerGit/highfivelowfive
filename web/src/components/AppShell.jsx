import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

/** Chrome shared by every page. Lists are public, so this has to render for a
 *  signed-out visitor too — it shows a way in rather than assuming a user. */
export default function AppShell({ children, wide = false }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-wire bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="rounded-sm">
            <Logo className="text-[11px]" />
          </Link>

          {user ? (
            <div className="flex items-center gap-5">
              <Link
                to="/feed"
                className="font-mono text-xs uppercase tracking-[0.14em] text-muted transition-colors hover:text-chalk"
              >
                Feed
              </Link>
              <Link
                to="/new"
                className="rounded-md bg-high px-3.5 py-2 font-display text-[13px] font-bold text-ink transition-colors hover:bg-high/85"
              >
                New list
              </Link>
              <Link
                to={`/u/${user.username}`}
                className="font-mono text-xs text-muted transition-colors hover:text-chalk"
              >
                @{user.username}
              </Link>
              <button
                onClick={logout}
                className="font-mono text-xs uppercase tracking-[0.14em] text-muted transition-colors hover:text-chalk"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="font-mono text-xs uppercase tracking-[0.14em] text-muted transition-colors hover:text-chalk"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className={`mx-auto px-6 py-12 ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
        {children}
      </main>
    </div>
  );
}
