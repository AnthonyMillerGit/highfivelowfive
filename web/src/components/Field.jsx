/** One labelled input. Keeping this in a single component is what makes every
 *  form in the app agree on spacing, focus, and error placement. */
export default function Field({ label, hint, multiline = false, ...props }) {
  // A textarea rather than a second component: the whole point of this file is
  // that every form agrees on spacing, focus and error placement, and a bio
  // that styled itself would be the first thing to drift.
  const Control = multiline ? "textarea" : "input";

  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      <Control
        {...props}
        className={`mt-2 w-full rounded-md border border-wire bg-ink px-3 py-2.5 text-chalk
                   placeholder:text-muted/50 transition-colors
                   hover:border-muted/60 focus:border-high focus:outline-none
                   focus-visible:outline-none ${
                     multiline ? "min-h-[92px] resize-y leading-relaxed" : ""
                   }`}
      />
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
