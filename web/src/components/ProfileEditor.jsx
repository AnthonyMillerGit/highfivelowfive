import { useState } from "react";
import { api } from "../lib/api";
import Field from "./Field";
import Button from "./Button";
import Alert from "./Alert";

// The server enforces these; repeating them here is what makes the counter
// possible and stops a doomed request being sent at all.
const MAX_NAME = 50;
const MAX_BIO = 300;

/**
 * The name and blurb at the top of your own profile.
 *
 * Editing happens in place rather than on a settings page, because these two
 * fields only make sense next to the thing they label — you are changing how
 * your profile reads, and the profile is right there.
 *
 * Your username is not here. It is in the URL of this page and of every list
 * on it, so changing it would break links other people have already shared.
 */
export default function ProfileEditor({ profile, onSaved, onCancel }) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
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
    <form onSubmit={submit} className="flex max-w-xl grow flex-col gap-4">
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
    </form>
  );
}
