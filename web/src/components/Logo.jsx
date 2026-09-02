/**
 * The wordmark is the product's thesis: two poles, one rule between them.
 * Gold rises, coral falls.
 */
export default function Logo({ className = "" }) {
  return (
    <span className={`inline-flex flex-col leading-none font-display font-extrabold tracking-[0.18em] ${className}`}>
      <span className="text-high">HIGH FIVE</span>
      <span className="my-[0.28em] h-px w-full bg-wire" aria-hidden="true" />
      <span className="text-low">LOW FIVE</span>
    </span>
  );
}
