import Monogram from "./Monogram";

const SIZES = {
  sm: "h-8 w-8 rounded-md",
  md: "h-10 w-10 rounded-lg",
  lg: "h-[88px] w-[88px] rounded-lg",
};

/**
 * Someone's face, or the letter that stands in for it.
 *
 * The monogram is not a placeholder to be replaced later — it stays the answer
 * for everyone who never uploads anything, which is most people. So this picks
 * between the two rather than the picture being the real one and the letter
 * being a failure state.
 *
 * Takes whoever is being shown — a user, an author, a profile — because all
 * three carry the same two fields this needs.
 */
export default function Avatar({ user, size = "sm", tone = "high" }) {
  if (!user?.avatar_url) {
    return <Monogram username={user?.username} size={size} tone={tone} />;
  }

  return (
    <img
      src={user.avatar_url}
      alt=""
      width={88}
      height={88}
      className={`shrink-0 border border-wire object-cover ${SIZES[size]}`}
    />
  );
}
