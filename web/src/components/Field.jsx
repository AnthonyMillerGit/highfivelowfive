/** One labelled input. Keeping this in a single component is what makes every
 *  form in the app agree on spacing, focus, and error placement. */
export default function Field({ label, hint, ...props }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      <input
        {...props}
        className="mt-2 w-full rounded-md border border-wire bg-ink px-3 py-2.5 text-chalk
                   placeholder:text-muted/50 transition-colors
                   hover:border-muted/60 focus:border-high focus:outline-none
                   focus-visible:outline-none"
      />
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
