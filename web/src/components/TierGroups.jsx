import ItemRow from "./ItemRow";

/**
 * The tier-list builder: rows gathered under their tier, with an Add button
 * per tier and a dropdown on each row to move it to another one.
 *
 * Rows live in one flat array; this only decides how they are drawn and which
 * two the arrows swap. Moving a row "up" means up within its own tier, which
 * is rarely its neighbour in the array — so each tier works out its members'
 * real positions and hands those to the arrows.
 */
export default function TierGroups({
  groups, items, onChange, onRelabel, onSwap, onRemove, onAdd, full,
}) {
  return (
    <div className="mt-2 flex flex-col gap-6">
      {groups.map((tier) => {
        // Position in the flat array, kept alongside the row.
        const members = items
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.label === tier);

        return (
          <div key={tier} className="rounded-lg border border-wire">
            <div className="flex items-center justify-between border-b border-wire px-4 py-2.5">
              <span className="font-display text-base font-extrabold text-high">{tier}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                {members.length} {members.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            <ol className="px-4">
              {members.map(({ item, index }, position) => (
                <ItemRow
                  key={item.key}
                  item={item}
                  groups={groups}
                  onChange={onChange}
                  onRelabel={onRelabel}
                  canUp={position > 0}
                  canDown={position < members.length - 1}
                  onUp={() => onSwap(index, members[position - 1].index)}
                  onDown={() => onSwap(index, members[position + 1].index)}
                  onRemove={onRemove}
                  canRemove={items.length > 1}
                />
              ))}
            </ol>

            <div className="px-4 pb-3 pt-2">
              <button
                type="button"
                onClick={() => onAdd(tier)}
                disabled={full}
                className="w-full rounded-md border border-dashed border-wire py-2
                           font-display text-[12px] font-bold text-muted transition-colors
                           hover:border-muted/60 hover:text-chalk disabled:opacity-40"
              >
                Add to {tier}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
