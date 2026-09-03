import { useEffect, useState } from "react";
import Avatar from "./Avatar";

// Kept in step with the server, which is the one that actually enforces it.
// This exists so a hopeless file is refused instantly instead of after a round
// trip that was never going to succeed.
const MAX_BYTES = 6 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp";

/**
 * Choosing a picture, without sending it anywhere.
 *
 * Nothing here touches the network. The picture is part of the profile form
 * now, so it has to be as undoable as the two text fields beside it — picking
 * one and then pressing Cancel has to leave the old one alone, and that is
 * only true if nothing was uploaded in the first place.
 *
 * What the person sees is therefore a local preview of a file that has not
 * been sent. The editor sends it on save.
 */
export default function AvatarPicker({
  user,
  file,
  removed,
  onPick,
  onRemove,
  onError,
  disabled,
}) {
  const [preview, setPreview] = useState(null);

  // An object URL is a live handle into browser memory, not a string. It has
  // to be released, or every picture tried on stays allocated until the tab
  // closes.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // What the avatar should look like right now, which is not necessarily what
  // is saved: a pending file wins, then a pending removal, then reality.
  const shown = preview
    ? { username: user.username, avatar_url: preview }
    : removed
      ? { username: user.username, avatar_url: null }
      : user;

  const hasPicture = Boolean(preview) || (!removed && Boolean(user.avatar_url));

  function choose(e) {
    const picked = e.target.files?.[0];
    // Clear it, or choosing the same file twice in a row fires no change event
    // and the second attempt looks like it did nothing.
    e.target.value = "";
    if (!picked) return;

    if (picked.size > MAX_BYTES) {
      onError("That image is bigger than 6MB. Try a smaller one.");
      return;
    }
    onError("");
    onPick(picked);
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <Avatar user={shown} size="lg" />

      <div className="flex items-center gap-2">
        <label
          className={`cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em]
                      text-muted underline decoration-wire underline-offset-4
                      transition-colors hover:text-high hover:decoration-high
                      ${disabled ? "pointer-events-none opacity-40" : ""}`}
        >
          {hasPicture ? "Change" : "Add photo"}
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={disabled}
            onChange={choose}
          />
        </label>

        {hasPicture && (
          <>
            <span className="text-wire">/</span>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted
                         underline decoration-wire underline-offset-4 transition-colors
                         hover:text-low hover:decoration-low disabled:opacity-40"
            >
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}
