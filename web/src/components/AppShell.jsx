import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

export default function AppShell({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-wire bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="rounded-sm">
            <Logo className="text-[11px]" />
          </Link>

          <div className="flex items-center gap-5">
            <span className="font-mono text-xs text-muted">@{user.username}</span>
            <button
              onClick={logout}
              className="font-mono text-xs uppercase tracking-[0.14em] text-muted
                         transition-colors hover:text-chalk"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
    </div>
  );
}
