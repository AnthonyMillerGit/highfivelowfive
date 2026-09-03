import { useState } from "react";
import { api } from "../lib/api";
import AvatarPicker from "./AvatarPicker";
import Field from "./Field";
import Button from "./Button";
import Alert from "./Alert";

// The server enforces these; repeating them here is what makes the counter
// possible and stops a doomed request being sent at all.
const MAX_NAME = 50;
const MAX_BIO = 300;

/**
 * Everything about a profile its owner can change: the picture, the name and
 * the blurb, behind one Save.
 *
 * These were three separate controls that each acted on their own, which asked
 * the reader to understand that a profile is really three settings. It is not.
 * It is one thing you are editing, so it gets one edit mode and one Cancel
 * that undoes all of it.
 *
 * Your username is not here. It is in the URL of this page and of every list
 * on it, so changing it would break links other people have already shared.
 */
export default function ProfileEditor({ user, profile, onSaved, onCancel }) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");

  // The picture is held, not sent, until save — see AvatarPicker.
  const [file, setFile] = useState(null);
  const [removed, setRemoved] = useState(false);

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setPending(true);

    try {
      // The picture and the text are two endpoints, so saving is two requests.
      // The picture goes first and the text second, which means the response
      // that lands last is the one carrying every field — including whichever
      // avatar_url this save just settled on.
      if (removed && !file) {
        await api("/api/me/avatar", { method: "DELETE" });
      } else if (file) {
        const body = new FormData();
        body.append("avatar", file);
        await api("/api/me/avatar", { method: "POST", body });
      }

      // Both fields go every time, and blank means blank — the server reads a
      // null as "clear it", which is what an emptied box should do.
      const updated = await api("/api/me", {
        method: "PATCH",
        body: {
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
        },
      });

      onSaved(updated);
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex grow items-start gap-6">
      <AvatarPicker
        user={user}
        file={file}
        removed={removed}
        disabled={pending}
        onError={setError}
        onPick={(picked) => {
          setFile(picked);
          setRemoved(false);
        }}
        onRemove={() => {
          setFile(null);
          setRemoved(true);
        }}
      />

      <div className="flex max-w-xl grow flex-col gap-4">
        <Alert>{error}</Alert>

        <Field
          label="Display name"
          value={displayName}
          maxLength={MAX_NAME}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={`@${profile.username}`}
          hint="Leave it empty to go by your handle."
        />

        <div>
          <Field
            label="Bio"
            multiline
            value={bio}
            maxLength={MAX_BIO}
            onChange={(e) => setBio(e.target.value)}
            placeholder="What do you rank, and what will you not be argued out of?"
          />
          <p className="mt-1.5 text-right font-mono text-[11px] text-muted">
            {bio.length}/{MAX_BIO}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-36">
            <Button pending={pending}>Save profile</Button>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted
                       transition-colors hover:text-chalk disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
