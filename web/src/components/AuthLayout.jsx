import { Link } from "react-router-dom";
import Logo from "./Logo";
import Rundown from "./Rundown";

/** Split shell shared by sign in and sign up: the argument on the left,
 *  the form on the right. The left panel is hidden on small screens so the
 *  form never gets pushed below the fold on a phone. */
export default function AuthLayout({ eyebrow, title, children, footer }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-wire bg-raised p-12 md:block">
        {/* One centred column so the panel reads as composed rather than
            left-hugging on a wide display. */}
        <div className="mx-auto flex h-full max-w-lg flex-col justify-between">
        <Link to="/" className="rounded-sm self-start">
          <Logo className="text-sm" />
        </Link>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Tonight's rundown
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold leading-[1.1]">
            Best action movies,
            <br />
            settled forever
          </h2>
          <div className="mt-8">
            <Rundown />
          </div>
        </div>

        <p className="max-w-sm text-sm leading-relaxed text-muted">
          Nothing is settled forever. Make your list, defend it in the comments,
          and watch someone else put Ronin at five.
        </p>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-10 inline-block rounded-sm md:hidden">
            <Logo className="text-xs" />
          </Link>

          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">{title}</h1>

          <div className="mt-8">{children}</div>

          <div className="mt-8 text-sm text-muted">{footer}</div>
        </div>
      </main>
    </div>
  );
}
