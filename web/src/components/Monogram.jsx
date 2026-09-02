const SIZES = {
  sm: "h-8 w-8 rounded-md text-[13px]",
  md: "h-10 w-10 rounded-lg text-[17px]",
  lg: "h-[88px] w-[88px] rounded-lg text-[38px]",
};

/** Stands in for an avatar until there are real ones. The initial is derived
 *  from the handle, so it is stable and never wrong. */
export default function Monogram({ username, size = "sm", tone = "high" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center border border-wire bg-raised
                  font-display font-extrabold ${SIZES[size]} ${
                    tone === "muted" ? "text-muted" : "text-high"
                  }`}
      aria-hidden="true"
    >
      {username ? username[0].toUpperCase() : "?"}
    </span>
  );
}
