/** Deliberately quiet: a page that is loading should not flash a big graphic
 *  for the 80ms a local request takes. */
export default function Spinner({ label = "Loading" }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
      {label}…
    </p>
  );
}
