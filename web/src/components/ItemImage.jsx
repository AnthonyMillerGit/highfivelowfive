import { useState } from "react";

/** Aspect ratios by list shape. Posters are 2:3, album art is 1:1, a still or
 *  a photo is 16:9 — the list picks one and every row keeps its rhythm. */
export const SHAPES = {
  square: { ratio: "aspect-square", label: "Square", hint: "Album art" },
  poster: { ratio: "aspect-[2/3]", label: "Poster", hint: "Film, books" },
  wide: { ratio: "aspect-[16/9]", label: "Wide", hint: "Stills, photos" },
};

/**
 * The picture slot for one item. An item without a picture is the normal case,
 * not a failure, so the empty state is a designed tile rather than a broken
 * image icon — and a link that rots falls back to the same tile.
 */
export default function ItemImage({ src, title, shape = "square", className = "w-20" }) {
  const [failed, setFailed] = useState(false);
  const ratio = SHAPES[shape]?.ratio ?? SHAPES.square.ratio;

  if (!src || failed) {
    return (
      <div
        className={`${className} ${ratio} flex shrink-0 items-center justify-center
                    rounded-md border border-wire bg-raised`}
        aria-hidden="true"
      >
        <span className="font-display text-lg font-extrabold text-wire">
          {title ? title[0].toUpperCase() : "?"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      loading="lazy"
      // Images can be on anyone's server: don't hand them the page the viewer
      // is reading, and don't let one block first paint.
      referrerPolicy="no-referrer"
      decoding="async"
      className={`${className} ${ratio} shrink-0 rounded-md border border-wire
                  bg-raised object-cover`}
    />
  );
}
