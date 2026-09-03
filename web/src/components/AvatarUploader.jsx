import { useRef, useState } from "react";
import { api } from "../lib/api";
import Avatar from "./Avatar";

// Kept in step with the server, which is the one that actually enforces it.
// This exists so a hopeless file is refused instantly instead of after a round
// trip that was never going to succeed.
const MAX_BYTES = 6 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp";

/**
 * Your own picture, with the controls to change it.
 *
 * The file input is hidden and driven by the button, because the native
 * control cannot be styled and says "No file chosen" in a font nobody picked.
 * The visible button is an ordinary button; the input is only the mechanism.
 */
export default function AvatarUploader({ user, onChange }) {
  const input = useRef(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function upload(file) {
    if (!file) return;
    setError("");

    if (file.size > MAX_BYTES) {
      setError("That image is bigger than 6MB. Try a smaller one.");
      return;
    }

    const body = new FormData();
    body.append("avatar", file);

    setPending(true);
    try {
      onChange(await api("/api/me/avatar", { method: "POST", body }));
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
      // Clear it, or choosing the same file twice in a row fires no change
      // event and the second attempt looks like it did nothing.
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setError("");
    setPending(true);
    try {
      onChange(await api("/api/me/avatar", { method: "DELETE" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar user={user} size="lg" />
        {pending && (
          <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-ink/70">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              …
            </span>
          </span>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={pending}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted
                     underline decoration-wire underline-offset-4 transition-colors
                     hover:text-high hover:decoration-high disabled:opacity-40"
        >
          {user.avatar_url ? "Change" : "Add photo"}
        </button>
        {user.avatar_url && (
          <>
            <span className="text-wire">/</span>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted
                         underline decoration-wire underline-offset-4 transition-colors
                         hover:text-low hover:decoration-low disabled:opacity-40"
            >
              Remove
            </button>
          </>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="max-w-[180px] text-center text-[11px] leading-relaxed text-low"
        >
          {error}
        </p>
      )}
    </div>
  );
}
