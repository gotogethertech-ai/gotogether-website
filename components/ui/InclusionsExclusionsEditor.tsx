"use client";

/** Editable plain-text list for either Inclusions or Exclusions — a
 * generic tag-list editor (add via Enter/button, remove via ✕) reused for
 * both, matching how they'll render as two parallel lists on the trip
 * detail page. */
export function TagListEditor({
  label,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  function addItem(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
  }
  function removeItem(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <span className="mb-2.5 block text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
        {label}
      </span>
      {items.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-md bg-surface-tint px-2.5 py-1 text-[11.5px] font-medium text-text-secondary"
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(i)}
                aria-label={`Remove ${item}`}
                className="text-text-muted hover:text-danger"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addItem(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
        onBlur={(e) => {
          addItem(e.currentTarget.value);
          e.currentTarget.value = "";
        }}
        className="w-full rounded-lg border-[1.5px] border-border-input px-3 py-2 text-[12.5px] outline-none focus:border-primary"
      />
      <p className="mt-1 text-[10.5px] text-text-muted">Press Enter to add</p>
    </div>
  );
}
