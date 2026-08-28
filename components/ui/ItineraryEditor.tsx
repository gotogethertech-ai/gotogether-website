"use client";

import { useRef, useState } from "react";

export type ItineraryDay = { day: string; title: string; text: string };

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB

/** Day-wise itinerary blocks, OR an uploaded PDF instead — organizer picks
 * one mode; switching modes clears the other so a trip never ends up with
 * both a stale day list and a stale PDF pointing at different content.
 * uploadPdf actually uploads to Supabase Storage (trip-documents bucket,
 * see migration 037) and resolves to its public URL; callers pass that
 * through to onPdfChange. */
export function ItineraryEditor({
  days,
  pdfUrl,
  onDaysChange,
  onPdfChange,
  uploadPdf,
}: {
  days: ItineraryDay[];
  pdfUrl: string | null;
  onDaysChange: (next: ItineraryDay[]) => void;
  onPdfChange: (next: string | null) => void;
  uploadPdf: (file: File) => Promise<string>;
}) {
  const [mode, setMode] = useState<"days" | "pdf">(pdfUrl ? "pdf" : "days");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function switchMode(next: "days" | "pdf") {
    setMode(next);
    setUploadError(null);
    if (next === "pdf") {
      onDaysChange([]);
    } else {
      onPdfChange(null);
    }
  }

  function addDay() {
    onDaysChange([...days, { day: `Day ${days.length + 1}`, title: "", text: "" }]);
  }
  function updateDay(i: number, patch: Partial<ItineraryDay>) {
    onDaysChange(days.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }
  function removeDay(i: number) {
    onDaysChange(days.filter((_, idx) => idx !== i));
  }

  async function handleFile(file: File) {
    setUploadError(null);
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are supported.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setUploadError("PDF is too large — max 10MB.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadPdf(file);
      onPdfChange(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Couldn't upload the PDF. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-2.5 block text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
        Itinerary
      </span>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          aria-pressed={mode === "days"}
          onClick={() => switchMode("days")}
          className={`flex-1 rounded-lg border px-3 py-2 text-[12px] font-semibold ${
            mode === "days"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border-input bg-white text-text-secondary hover:bg-surface-hover"
          }`}
        >
          Write day-by-day
        </button>
        <button
          type="button"
          aria-pressed={mode === "pdf"}
          onClick={() => switchMode("pdf")}
          className={`flex-1 rounded-lg border px-3 py-2 text-[12px] font-semibold ${
            mode === "pdf"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border-input bg-white text-text-secondary hover:bg-surface-hover"
          }`}
        >
          Upload a PDF instead
        </button>
      </div>

      {mode === "days" ? (
        <div>
          {days.length > 0 && (
            <div className="mb-3 flex flex-col gap-3">
              {days.map((d, i) => (
                <div key={i} className="rounded-xl border border-border-divider p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      value={d.day}
                      onChange={(e) => updateDay(i, { day: e.target.value })}
                      placeholder="Day 1"
                      className="w-24 flex-none rounded-lg border-[1.5px] border-border-input px-2.5 py-1.5 text-[12px] font-bold text-primary outline-none focus:border-primary"
                    />
                    <input
                      value={d.title}
                      onChange={(e) => updateDay(i, { title: e.target.value })}
                      placeholder="Title (optional)"
                      className="flex-1 rounded-lg border-[1.5px] border-border-input px-2.5 py-1.5 text-[12.5px] font-semibold outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removeDay(i)}
                      aria-label={`Remove ${d.day || "day"}`}
                      className="flex-none rounded-lg px-2 py-1.5 text-[12px] font-semibold text-danger hover:bg-surface-hover"
                    >
                      ✕
                    </button>
                  </div>
                  <textarea
                    value={d.text}
                    onChange={(e) => updateDay(i, { text: e.target.value })}
                    rows={2}
                    placeholder="What happens this day…"
                    className="w-full resize-none rounded-lg border-[1.5px] border-border-input px-2.5 py-2 text-[12.5px] outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={addDay} className="text-[12px] font-semibold text-primary hover:underline">
            + Add a day
          </button>
        </div>
      ) : (
        <div>
          {pdfUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-border-divider p-3">
              <span aria-hidden="true" className="text-lg">📄</span>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-[12.5px] font-semibold text-primary hover:underline"
              >
                View uploaded itinerary
              </a>
              <button
                type="button"
                onClick={() => onPdfChange(null)}
                className="flex-none text-[11.5px] font-semibold text-danger hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-xl border-[1.5px] border-dashed border-border-input px-4 py-6 text-center text-[12.5px] font-semibold text-text-secondary hover:border-primary hover:text-primary disabled:opacity-60"
              >
                {uploading ? "Uploading…" : "Click to upload a PDF (max 10MB)"}
              </button>
              {uploadError && <p className="mt-1.5 text-[11px] font-medium text-danger">{uploadError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
