import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Creates a REAL, immediately-usable account (auth.users + public.users)
 * on an admin's behalf — the "no pending registration" flow requested
 * directly by the product owner, in place of the original Option A
 * (pending_registrations row that activates on first Google sign-in).
 *
 * Auth in this project is Google OAuth only (see lib/auth-context.tsx's
 * top comment) — there is no password login UI. So a "real, usable
 * immediately" account here means: a real auth.users row exists, with a
 * system-generated temporary password the admin must relay to the person
 * out-of-band (there is no email-invite provider configured). The person
 * can sign in with that email + password, or later link Google to the
 * same email — Supabase auth treats a matching verified email as the
 * same identity.
 *
 * Must run server-side: creating an auth.users row via the Admin API
 * requires the service role secret key, which must never reach the
 * browser bundle. This route reads SUPABASE_SERVICE_ROLE_KEY from the
 * server environment only — never expose it as NEXT_PUBLIC_*.
 */
export async function POST(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !url) {
    return NextResponse.json(
      {
        error:
          "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (Supabase Dashboard → Project Settings → API → service_role key) and restart the dev server.",
      },
      { status: 500 }
    );
  }

  // Verify the caller is a signed-in staff member using the request's
  // session cookie — never trust a client-supplied role/id.
  const sessionClient = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await sessionClient.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: callerProfile } = await sessionClient
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!callerProfile || (callerProfile.role !== "admin" && callerProfile.role !== "moderator")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  const tempPassword = generateTempPassword();

  const admin = createAdminClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    phone: phone || undefined,
    password: tempPassword,
    email_confirm: true,
    phone_confirm: !!phone,
    user_metadata: { full_name: name },
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Failed to create account." }, { status: 400 });
  }

  // handle_new_auth_user() provisions public.users synchronously on the
  // auth.users insert trigger; a short retry covers the same rare race
  // condition auth-context.tsx already retries for on sign-in.
  let profileRow = await admin.from("users").select("id").eq("id", created.user.id).maybeSingle();
  if (!profileRow.data) {
    await new Promise((r) => setTimeout(r, 400));
    profileRow = await admin.from("users").select("id").eq("id", created.user.id).maybeSingle();
  }

  // write_audit_log() checks is_staff() against auth.uid(), but the
  // service-role client has no session (auth.uid() is null for it), so
  // that RPC would always reject here. The service-role key already
  // bypasses RLS, so insert the audit row directly instead, with the
  // real staff member recorded as actor_id (already verified above).
  await admin.from("audit_logs").insert({
    actor_id: authUser.id,
    action: "user_created_direct",
    entity_type: "user",
    entity_id: created.user.id,
    new_value: { name, email, phone: phone || null },
  });

  return NextResponse.json({ id: created.user.id, tempPassword });
}

function generateTempPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 20);
}
