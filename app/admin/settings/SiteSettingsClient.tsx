"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { setSiteSetting } from "@/lib/admin/mutations";
import { AdminButton, useLiveAnnouncer } from "@/components/admin/ui";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin/guard";

const WHATSAPP_KEY = "whatsapp_support_number";

/**
 * Site-wide settings an admin can edit without a code deploy (migration
 * 058). First (and so far only) setting: the WhatsApp support number that
 * powers the floating "Need help? Chat with us" button shown on every
 * page (components/WhatsAppSupportButton.tsx) — the button hides itself
 * entirely while this is unset.
 */
export function SiteSettingsClient() {
  const { user } = useAuth();
  const [value, setValue] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { announce, region } = useLiveAnnouncer();

  const load = useCallback(() => {
    setError(false);
    const supabase = createClient();
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", WHATSAPP_KEY)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setError(true);
          return;
        }
        setValue(data?.value ?? null);
        setDraft(data?.value ?? "");
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = can(user, "siteSettings.manage");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const trimmed = draft.trim();
    // A WhatsApp deep link (wa.me/<digits>) needs digits only (with an
    // optional leading +), or an empty value to hide the button.
    if (trimmed && !/^\+?[0-9]{7,15}$/.test(trimmed)) {
      setFormError("Enter a phone number in international format, e.g. +919876543210.");
      return;
    }
    setSaving(true);
    try {
      await setSiteSetting(WHATSAPP_KEY, trimmed || null);
      setValue(trimmed || null);
      announce("Saved.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {region}
      <h1 className="mb-1 font-display text-[26px] font-bold">Site settings</h1>
      <p className="mb-6 text-[13px] text-[oklch(50%_0.01_255)]">
        Site-wide settings that take effect immediately, without a code deploy.
      </p>

      {error ? (
        <p className="text-[13px] text-[oklch(45%_0.16_25)]">Couldn&apos;t load settings.</p>
      ) : !loaded ? (
        <p className="text-[13px] text-[oklch(50%_0.01_255)]">Loading…</p>
      ) : (
        <div className="max-w-[480px] rounded-2xl border border-[oklch(90%_0.005_255)] bg-white p-6">
          <h2 className="mb-1 text-[15px] font-bold">WhatsApp support</h2>
          <p className="mb-4 text-[12px] text-[oklch(50%_0.01_255)]">
            Powers the floating &quot;Need help? Chat with us&quot; button shown on every page. Clicking it opens a
            WhatsApp chat to this number with a prefilled message. Leave blank to hide the button entirely.
          </p>

          <form onSubmit={save}>
            <label className="mb-1 block text-[11.5px] font-semibold">WhatsApp number</label>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="+919876543210"
              disabled={!canManage}
              className="mb-1 w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px] disabled:bg-[oklch(97%_0.003_255)]"
            />
            <p className="mb-3 text-[10.5px] text-[oklch(55%_0.01_255)]">
              International format, digits only after the +. Currently: {value ?? "not set"}.
            </p>
            {formError && <p className="mb-3 text-[12px] text-[oklch(45%_0.16_25)]">{formError}</p>}
            {canManage ? (
              <AdminButton variant="primary" type="submit" loading={saving}>
                Save
              </AdminButton>
            ) : (
              <p className="text-[11.5px] text-[oklch(55%_0.01_255)]">Only admins can change this setting.</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
