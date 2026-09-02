import { useState } from "react";
import { api } from "../lib/api";

/** Follow / Following, with the button flipping to "Unfollow" on hover so the
 *  destructive action is never a surprise click. */
export default function FollowButton({ username, following, onChange }) {
  const [pending, setPending] = useState(false);
  const [hovering, setHovering] = useState(false);

  async function toggle() {
    setPending(true);
    // Move the UI first — a follow should feel instant — but hand the truth
    // back if the request fails, rather than leaving a lie on screen.
    const next = !following;
    onChange(next);
    try {
      await api(`/api/users/${username}/follow`, {
        method: next ? "POST" : "DELETE",
      });
    } catch {
      onChange(!next);
    } finally {
      setPending(false);
    }
  }

  const label = following ? (hovering ? "Unfollow" : "Following") : "Follow";

  return (
    <button
      onClick={toggle}
      disabled={pending}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      // A fixed width keeps the button still: "Follow", "Following" and
      // "Unfollow" are different lengths, and a right-aligned button that
      // resizes would slide out from under the cursor mid-hover.
      className={`min-w-[112px] rounded-md px-5 py-2.5 text-center font-display text-[13px]
                  font-bold transition-colors disabled:opacity-60 ${
                    following
                      ? hovering
                        ? "border border-low/50 bg-low/10 text-low"
                        : "border border-wire text-muted"
                      : "bg-high text-ink hover:bg-high/85"
                  }`}
    >
      {label}
    </button>
  );
}
