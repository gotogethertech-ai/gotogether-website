"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth, ageFromDateOfBirth, MINIMUM_AGE, type SessionUser } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

/** Must match migration 027_avatars_storage_bucket's bucket constraints
 * exactly, so a rejected upload fails fast client-side with a clear
 * message instead of round-tripping to Storage first. */
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Today's date minus MINIMUM_AGE years, as an ISO date — the max value
 * accepted by the DOB <input type="date">, so the picker itself refuses to
 * let a visibly-under-18 date be selected in the first place. */
function maxDateOfBirth(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MINIMUM_AGE);
  return d.toISOString().slice(0, 10);
}

/**
 * Edit Profile — a single scrollable form (not a step wizard, per the
 * Personal User Area Blueprint: this is editing an already-complete
 * identity, not building something from nothing), grouped into Photo &
 * Name / About You / Personal Details. Reuses the Onboarding name field's
 * validation rule (2–50 chars) directly.
 *
 * Rewritten to be fully real (Aug 2026): loads and saves the signed-in
 * user's actual public.users row via Supabase, rather than the old mock
 * getProfile()/setTimeout stand-in. Also the home for the new Date of
 * Birth + Gender fields required for the 18+ / profile-completeness gate
 * (see requireCompleteProfile in lib/auth-context.tsx) — self-service
 * writes go straight through the users_update_self RLS policy, no RPC
 * needed. Fields with no real column yet (city, travel style, emergency
 * contact) were dropped rather than kept as fake inputs that silently
 * discarded input, consistent with the project's no-fabricated-data rule.
 */
export function EditProfileClient() {
  const { user, isLoggedIn, loading, requireAuth } = useAuth();
  // Derived, not stored: authChecked is true exactly when AuthProvider has
  // finished its async session hydration AND the resulting session is a
  // real signed-in user. The `loading` guard is what prevents the login
  // loop — without it, a signed-in visitor arriving via a full page load
  // (refresh, direct URL, or the redirect back from /auth/callback) sees
  // `user` still null and this effect kicks off a real Google sign-in
  // redirect for someone whose session cookie is already valid.
  const authChecked = !loading && isLoggedIn;

  useEffect(() => {
    if (loading || isLoggedIn) return;
    requireAuth("edit your profile", () => {});
  }, [loading, isLoggedIn, requireAuth]);

  if (!authChecked || !user) {
    return (
      <>
        <Header activePath="/" />
        <main className="flex-1 bg-surface" />
        <Footer />
      </>
    );
  }

  // key={user.id} below: forces a fresh mount (and fresh lazy-initialized
  // form state) whenever the signed-in user changes, so the form's
  // useState initializers — which read from `user` exactly once, at
  // mount — never need an effect to re-seed themselves. That sidesteps
  // the react-hooks/set-state-in-effect rule entirely rather than working
  // around it with a ref.
  return <EditProfileForm key={user.id} user={user} />;
}

function EditProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth ?? "");
  const [gender, setGender] = useState(user.gender ?? "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState("");
  const [dobError, setDobError] = useState("");
  const [genderError, setGenderError] = useState("");
  const [saveError, setSaveError] = useState("");

  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch bio separately since it's not carried on SessionUser.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("users")
      .select("bio")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setBio(data.bio ?? "");
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const reason = searchParams.get("reason");
  const nextPath = searchParams.get("next");

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
    };
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input's value so selecting the same file again (e.g. after
    // a validation error) still fires onChange.
    e.target.value = "";
    if (!file) return;

    const ext = AVATAR_MIME_TO_EXT[file.type];
    if (!ext) {
      setAvatarError("Please choose a JPEG, PNG, or WEBP image");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("Image must be 5MB or smaller");
      return;
    }
    setAvatarError("");
    setAvatarUploading(true);
    try {
      const supabase = createClient();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new photo shows immediately instead of a
      // browser-cached copy of the old file at the same URL.
      const bustedUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: bustedUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setAvatarUrl(bustedUrl);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Couldn't upload your photo. Try again.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSave() {
    if (name.trim().length < 2 || name.trim().length > 50) {
      setNameError("Enter a name between 2 and 50 characters");
      return;
    }
    setNameError("");

    if (!dateOfBirth) {
      setDobError("Date of birth is required");
      return;
    }
    if (ageFromDateOfBirth(dateOfBirth) < MINIMUM_AGE) {
      setDobError(`You must be at least ${MINIMUM_AGE} to use GoTogether`);
      return;
    }
    setDobError("");

    if (!gender) {
      setGenderError("Select a gender");
      return;
    }
    setGenderError("");

    setSaving(true);
    setSaveError("");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          bio: bio.trim() || null,
          date_of_birth: dateOfBirth,
          gender,
        })
        .eq("id", user.id);
      if (error) throw error;
      setSaved(true);
      setDirty(false);
      window.setTimeout(() => {
        setSaved(false);
        router.push(nextPath || "/profile");
      }, 900);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push("/profile");
  }

  return (
    <>
      <Header activePath="/" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[560px] px-8 py-8 pb-20 max-[599px]:px-4">
          <h1 className="mb-2 font-display text-xl font-bold">Edit Profile</h1>

          {reason === "complete-profile" && (
            <p className="mb-6 rounded-xl bg-surface-hover px-4 py-3 text-[12.5px] font-medium text-text-secondary">
              GoTogether requires date of birth and gender on file before you can create or join a
              trip — you must also be {MINIMUM_AGE}+ to use GoTogether. Fill these in below to
              continue.
            </p>
          )}

          <FieldGroup title="Photo & Name">
            <div className="mb-4 flex items-center gap-4">
              {avatarUrl ? (
                // Avatar host is user-controlled Supabase Storage; a plain
                // <img> avoids next/image's remote-pattern allowlist config
                // for a single small circular thumbnail.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-16 w-16 flex-none rounded-full object-cover"
                  style={{ width: 64, height: 64 }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-surface-avatar text-base font-bold text-[oklch(40%_0.1_255)]"
                  style={{ width: 64, height: 64 }}
                >
                  {user.initials}
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  disabled={avatarUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-border-input px-4 py-2 text-[12px] font-semibold text-text-secondary hover:bg-surface-hover disabled:opacity-60"
                >
                  {avatarUploading ? "Uploading…" : "Change photo"}
                </button>
                {avatarError && (
                  <p className="mt-1.5 text-[11px] font-medium text-danger">{avatarError}</p>
                )}
              </div>
            </div>
            <label htmlFor="edit-name" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
              Your name
            </label>
            <input
              id="edit-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
                if (nameError) setNameError("");
              }}
              className={`w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none font-sans ${
                nameError ? "border-danger" : "border-border-input focus:border-primary"
              }`}
            />
            {nameError && <p className="mt-1.5 text-[11px] font-medium text-danger">{nameError}</p>}
          </FieldGroup>

          <FieldGroup title="About You">
            <label htmlFor="edit-bio" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
              Bio
            </label>
            <textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => markDirty(setBio)(e.target.value.slice(0, 250))}
              rows={3}
              className="mb-1 w-full resize-none rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-[13px] outline-none focus:border-primary font-sans"
            />
            <p className="text-right text-[10.5px] text-text-muted">{bio.length}/250</p>
          </FieldGroup>

          <FieldGroup title="Personal Details">
            <p className="mb-3 text-[11px] text-text-muted">
              Required to create or join trips. Your exact date of birth is never shown publicly.
            </p>
            <label htmlFor="edit-dob" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
              Date of birth
            </label>
            <input
              id="edit-dob"
              type="date"
              value={dateOfBirth}
              max={maxDateOfBirth()}
              onChange={(e) => {
                setDateOfBirth(e.target.value);
                setDirty(true);
                if (dobError) setDobError("");
              }}
              className={`mb-1 w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none font-sans ${
                dobError ? "border-danger" : "border-border-input focus:border-primary"
              }`}
            />
            {dobError && <p className="mb-4 text-[11px] font-medium text-danger">{dobError}</p>}
            {!dobError && <div className="mb-4" />}

            <label htmlFor="edit-gender" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
              Gender
            </label>
            <select
              id="edit-gender"
              value={gender}
              onChange={(e) => {
                setGender(e.target.value);
                setDirty(true);
                if (genderError) setGenderError("");
              }}
              className={`w-full rounded-xl border-[1.5px] bg-white px-3.5 py-3 text-sm outline-none font-sans ${
                genderError ? "border-danger" : "border-border-input focus:border-primary"
              }`}
            >
              <option value="" disabled>
                Select gender
              </option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {genderError && <p className="mt-1.5 text-[11px] font-medium text-danger">{genderError}</p>}
          </FieldGroup>

          {dirty && (
            <p className="mb-3 text-[11.5px] font-medium text-text-tertiary">
              You have unsaved changes to your profile
            </p>
          )}
          {saveError && <p className="mb-3 text-[11.5px] font-medium text-danger">{saveError}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-primary px-6 py-3 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={handleCancel} className="text-[13px] font-semibold text-text-secondary hover:text-primary">
              Cancel
            </button>
            {saved && <span className="text-[12px] font-semibold text-trust-fg">✓ Saved</span>}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-2xl border border-border p-5">
      <h2 className="mb-3 text-[12px] font-bold text-text-tertiary uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}
