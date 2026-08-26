import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Travel company self-registration + status reads, backed by migration
 * 029_company_self_registration. A user registers their own company from
 * their profile page (register_company RPC — SECURITY DEFINER, enforces
 * "one company per user" and inserts as company_status = 'under_review'
 * for admin review, matching the existing verification-review precedent).
 * Once an admin flips a company to 'verified' (admin_verify_company, out
 * of scope here), Create Trip's Partner option becomes available to every
 * member of that company.
 */

export type CompanyStatus = Database["public"]["Enums"]["company_status"];

export type MyCompany = {
  id: string;
  name: string;
  contactEmail: string | null;
  registrationNumber: string | null;
  gstNumber: string | null;
  status: CompanyStatus;
};

/** The signed-in user's registered company, or null if they haven't
 * registered one. RLS on companies/company_users only exposes rows the
 * caller belongs to (via company_users), so no extra userId filter is
 * needed beyond what the session already provides. */
export async function getMyCompany(): Promise<MyCompany | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_users")
    .select("companies(id, name, contact_email, registration_number, gst_number, status)")
    .maybeSingle();
  if (error || !data) return null;

  const company = Array.isArray(data.companies) ? data.companies[0] : data.companies;
  if (!company) return null;

  return {
    id: company.id,
    name: company.name,
    contactEmail: company.contact_email,
    registrationNumber: company.registration_number,
    gstNumber: company.gst_number,
    status: company.status,
  };
}

export type RegisterCompanyFields = {
  name: string;
  contactEmail: string;
  registrationNumber: string;
  // Relaxed/optional at launch per product decision — collected but not
  // enforced. Will become mandatory once the platform has a larger
  // company base (see migration 029's column comment).
  gstNumber: string;
};

/** Registers the signed-in user's travel company. Throws with a message
 * safe to surface to the user — the RPC itself raises a clear exception
 * for "already registered" and "empty name" cases. */
export async function registerCompany(fields: RegisterCompanyFields): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("register_company", {
    p_name: fields.name.trim(),
    p_contact_email: fields.contactEmail.trim() || undefined,
    p_registration_number: fields.registrationNumber.trim() || undefined,
    p_gst_number: fields.gstNumber.trim() || undefined,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Couldn't register your company. Try again.");
  }
  return data;
}

export function companyStatusLabel(status: CompanyStatus): string {
  switch (status) {
    case "verified":
      return "Verified Partner";
    case "suspended":
      return "Suspended";
    case "under_review":
    default:
      return "Under review";
  }
}
