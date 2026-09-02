/** Errors state what went wrong and stay in the interface's voice. */
export default function Alert({ children }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-low/40 bg-low/10 px-3 py-2.5 text-sm text-low"
    >
      {children}
    </p>
  );
}
