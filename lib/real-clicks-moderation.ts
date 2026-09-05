import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Clicks Phase 5 — reporting. Files into the generic public.reports table
 * (migration 065) rather than anything Clicks-specific: content_type/
 * content_id is a polymorphic reference (same convention audit_logs
 * already uses for entity_type/entity_id), so reporting a trip or review
 * later needs no new table, just a new report_content_type enum value.
 * The admin-side moderation actions (hide/delete a Click, remove a
 * comment, resolve a report) live in lib/admin/mutations.ts alongside
 * every other admin_* RPC wrapper, not here — this file is the
 * user-facing "file a report" half only.
 */

export type ReportReason = Database["public"]["Enums"]["report_reason"];
export type ReportContentType = Database["public"]["Enums"]["report_content_type"];

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam or misleading" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "misinformation", label: "False or misleading information" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "other", label: "Something else" },
];

/** Reports a Click or a comment on one (spec sections 17/18). Any signed-in
 * user may file a report on their own behalf — report_content has no
 * is_staff() gate, only an auth check. */
export async function reportContent(
  contentType: ReportContentType,
  contentId: string,
  reason: ReportReason,
  details?: string
): Promise<void> {
  const supabase = createClient();
  const trimmedDetails = details?.trim();
  const { error } = await supabase.rpc("report_content", {
    p_content_type: contentType,
    p_content_id: contentId,
    p_reason: reason,
    p_details: trimmedDetails ? trimmedDetails.slice(0, 1000) : undefined,
  });
  if (error) throw new Error(error.message);
}
