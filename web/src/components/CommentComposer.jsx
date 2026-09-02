import { useState } from "react";

export default function CommentComposer({
  onSubmit, placeholder, submitLabel = "Post comment", onCancel, autoFocus = false,
}) {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setPending(true);
    setError("");
    try {
      await onSubmit(body.trim());
      setBody(""); // only cleared once the server has it
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-wire bg-raised p-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        autoFocus={autoFocus}
        className="w-full resize-y bg-transparent text-sm leading-relaxed text-chalk
                   placeholder:text-muted focus:outline-none"
      />
      {error && <p className="mt-2 text-sm text-low">{error}</p>}
      <div className="mt-3 flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted
                       transition-colors hover:text-chalk"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="rounded-md bg-high px-4 py-2 font-display text-[13px] font-bold text-ink
                     transition-colors hover:bg-high/85
                     disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Posting…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
