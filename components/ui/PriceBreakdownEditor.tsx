"use client";

export type PriceBreakdownItem = { label: string; amount: number | null };

/** Editable list of {label, amount} rows shown under Price on a Verified
 * Partner trip's detail page — purely descriptive, doesn't affect the
 * trip's headline price/original_price fields (those stay the source of
 * truth for the struck-through discount display elsewhere). */
export function PriceBreakdownEditor({
  items,
  onChange,
}: {
  items: PriceBreakdownItem[];
  onChange: (next: PriceBreakdownItem[]) => void;
}) {
  function updateRow(i: number, patch: Partial<PriceBreakdownItem>) {
    onChange(items.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRow(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function addRow() {
    onChange([...items, { label: "", amount: null }]);
  }

  return (
    <div>
      <span className="mb-2.5 block text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
        Price breakdown
      </span>
      <p className="mb-3 text-[11px] text-text-muted">
        Optional line items shown to travellers (e.g. Accommodation, Transport) — doesn&apos;t change the price above.
      </p>
      {items.length > 0 && (
        <div className="mb-2 flex flex-col gap-2">
          {items.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={row.label}
                onChange={(e) => updateRow(i, { label: e.target.value })}
                placeholder="e.g. Accommodation"
                className="flex-1 rounded-lg border-[1.5px] border-border-input px-3 py-2 text-[12.5px] outline-none focus:border-primary"
              />
              <input
                type="number"
                min={0}
                value={row.amount ?? ""}
                onChange={(e) => updateRow(i, { amount: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="₹"
                className="w-28 rounded-lg border-[1.5px] border-border-input px-3 py-2 text-[12.5px] outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Remove line item"
                className="flex-none rounded-lg px-2.5 py-2 text-[12px] font-semibold text-danger hover:bg-surface-hover"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addRow}
        className="text-[12px] font-semibold text-primary hover:underline"
      >
        + Add line item
      </button>
    </div>
  );
}
