export default function Button({ children, pending, ...props }) {
  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      className="w-full rounded-md bg-high px-4 py-2.5 font-display text-sm font-bold
                 tracking-wide text-ink transition-[background-color,opacity]
                 hover:bg-high/85 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Working…" : children}
    </button>
  );
}
