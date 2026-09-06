import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Real ID verification submission (the missing half of the existing
 * `verifications` table + admin review queue at app/admin/verification/).
 * That table and its RLS already existed, dormant, with an empty
 * `startVerification()` no-op in auth-context.tsx — this file is the
 * actual write path: upload the ID photo to the private `id-documents`
 * storage bucket, then insert the review row. Mirrors
 * lib/real-clicks.ts's uploadClickPhoto pattern (validate -> upload ->
 * insert row -> clean up the orphaned file if the row insert fails), with
 * one deliberate difference: id-documents is a PRIVATE bucket (a
 * government ID scan is sensitive PII), so this stores the storage path
 * in `document_url`, not a public URL — a signed URL is generated only
 * when staff actually view it in the admin queue (getVerificationDocumentUrl).
 */

export type VerificationDocumentType = Database["public"]["Tables"]["verifications"]["Row"]["document_type"];

export const VERIFICATION_DOCUMENT_TYPES: { value: string; label: string }[] = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving Licence" },
  { value: "voter_id", label: "Voter ID" },
];

export const VERIFICATION_DOC_MAX_BYTES = 8 * 1024 * 1024; // 8MB, matches the bucket's file_size_limit
const DOC_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class VerificationValidationError extends Error {}

export type VerificationState =
  | { kind: "unverified" }
  | { kind: "pending"; submittedAt: string }
  | { kind: "verified" }
  | { kind: "rejected"; reason: string | null; verificationId: string };

const REJECTION_LABELS: Record<string, string> = {
  blurry_image: "The photo was too blurry to read",
  name_mismatch: "The name on the document didn't match your profile",
  expired_document: "The document has expired",
  selfie_mismatch: "Selfie didn't match the document",
  unsupported_document_type: "That document type isn't supported",
};

/**
 * Derives the real verification state for a user by combining
 * users.verification_status (the source of truth once approved) with
 * the latest row in `verifications` (the only place "pending" or
 * "rejected" lives — the users table has no id_pending value; see this
 * function's own comment on why that's a deliberate choice, not a gap).
 */
export async function getVerificationState(userId: string): Promise<VerificationState> {
  const supabase = createClient();

  const { data: userRow } = await supabase.from("users").select("verification_status").eq("id", userId).maybeSingle();
  if (userRow?.verification_status === "id_verified") return { kind: "verified" };

  const { data: latest } = await supabase
    .from("verifications")
    .select("id, status, rejection_reason, submitted_at")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) return { kind: "unverified" };
  if (latest.status === "pending") return { kind: "pending", submittedAt: latest.submitted_at };
  if (latest.status === "rejected") {
    return {
      kind: "rejected",
      reason: latest.rejection_reason ? (REJECTION_LABELS[latest.rejection_reason] ?? latest.rejection_reason) : null,
      verificationId: latest.id,
    };
  }
  // status === 'approved' but users.verification_status hasn't caught up
  // yet (shouldn't normally happen — admin_approve_verification sets both
  // in one transaction) — treat as unverified rather than claim verified
  // on data we can't confirm.
  return { kind: "unverified" };
}

/**
 * Submits a new ID verification request: uploads the document photo to
 * the private id-documents bucket (folder-per-user, same convention as
 * avatars/click-photos), then inserts the review row. A user with an
 * existing pending row shouldn't call this again (the caller should
 * check getVerificationState first) — this doesn't itself enforce
 * one-pending-at-a-time, matching the table's own lack of a partial
 * unique constraint for that.
 */
export async function submitVerification(userId: string, documentType: string, file: File): Promise<void> {
  const ext = DOC_MIME_TO_EXT[file.type];
  if (!ext) throw new VerificationValidationError("Please choose a JPEG, PNG, or WEBP image.");
  if (file.size > VERIFICATION_DOC_MAX_BYTES) throw new VerificationValidationError("The photo must be 8MB or smaller.");

  const supabase = createClient();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("id-documents").upload(path, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from("verifications").insert({
    user_id: userId,
    document_type: documentType,
    document_url: path,
  });
  if (error) {
    // Row failed — clean up the file we just uploaded so it isn't left
    // orphaned in a bucket nothing references (mirrors uploadClickPhoto's
    // same-shaped cleanup-on-failure).
    await supabase.storage.from("id-documents").remove([path]);
    throw new Error(error.message);
  }
}

/** Staff-only: a short-lived signed URL for viewing a submitted document
 * in the admin review queue. id-documents has no public/self-read
 * policy, so this is the only way to actually see the image — callers
 * must already be staff (RLS enforces this regardless). */
export async function getVerificationDocumentUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("id-documents").createSignedUrl(path, 300);
  if (error || !data) return null;
  return data.signedUrl;
}
