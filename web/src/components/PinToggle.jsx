import { useState } from "react";
import { api } from "../lib/api";

function PinIcon({ filled }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  );
}

/**
 * Pin or unpin one of your own lists.
 *
 * Both answers are the same request to the same place with a different verb,
 * so this is one control rather than two. The server owns the rule about how
 * many fit — when the shelf is full it says so, and that sentence is handed
 * up to whoever is rendering this rather than invented here.
 *
 * `icon` sits on a card in a grid; `text` sits in a row of links on the list
 * page. Same behaviour, different clothes.
 */
export default function PinToggle({ list, variant = "icon", onChange, onError }) {
  const [pending, setPending] = useState(false);

  async function toggle() {
    onError?.("");
    setPending(true);
    try {
      await api(`/api/lists/${list.id}/pin`, {
        method: list.pinned ? "DELETE" : "POST",
      });
      await onChange?.(!list.pinned);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setPending(false);
    }
  }

  const label = list.pinned ? "Unpin from profile" : "Pin to profile";

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={list.pinned}
        className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase
                    tracking-[0.16em] underline underline-offset-4 transition-colors
                    disabled:opacity-40 ${
                      list.pinned
                        ? "text-high decoration-high/50 hover:text-chalk"
                        : "text-muted decoration-wire hover:text-high hover:decoration-high"
                    }`}
      >
        <PinIcon filled={list.pinned} />
        {list.pinned ? "Pinned" : "Pin to profile"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={list.pinned}
      aria-label={label}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded-md border
                  transition-colors disabled:opacity-40 ${
                    list.pinned
                      ? "border-high/50 bg-high/15 text-high hover:bg-high/25"
                      : "border-wire bg-raised text-muted hover:border-muted/60 hover:text-chalk"
                  }`}
    >
      <PinIcon filled={list.pinned} />
    </button>
  );
}
