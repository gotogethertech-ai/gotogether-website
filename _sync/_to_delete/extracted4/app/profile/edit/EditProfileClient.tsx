"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";
import { getProfile } from "@/lib/profiles-data";

/**
 * Edit Profile — a single scrollable form (not a step wizard, per the
 * Personal User Area Blueprint: this is editing an already-complete
 * identity, not building something from nothing), grouped into Photo &
 * Name / About You / Travel Preferences / Emergency Contact. Reuses the
 * Onboarding name field's validation rule (2–50 chars) directly.
 */
export function EditProfileClient() {
  const { user, isLoggedIn, requireAuth } = useAuth();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(() => isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) return;
    requireAuth("edit your profile", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profile = user ? getProfile(user.name) ?? getProfile("riya-anand")! : null;

  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [travelStyle, setTravelStyle] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState("");

  if (!authChecked || !profile) {
    return (
      <>
        <Header activePath="/" />
        <main className="flex-1 bg-surface" />
        <Footer />
      </>
    );
  }

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
    };
  }

  function handleSave() {
    if (name.trim().length < 2 || name.trim().length > 50) {
      setNameError("Enter a name between 2 and 50 characters");
      return;
    }
    setNameError("");
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setDirty(false);
      window.setTimeout(() => {
        setSaved(false);
        router.push("/profile");
      }, 900);
    }, 500);
  }

  function handleCancel() {
    router.push("/profile");
  }

  return (
    <>
      <Header activePath="/" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[560px] px-8 py-8 pb-20 max-[599px]:px-4">
          <h1 className="mb-6 font-display text-xl font-bold">Edit Profile</h1>

          <FieldGroup title="Photo & Name">
            <div className="mb-4 flex items-center gap-4">
              <div
                aria-hidden="true"
                className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-surface-avatar text-base font-bold text-[oklch(40%_0.1_255)]"
                style={{ width: 64, height: 64 }}
              >
                {profile.initials}
              </div>
              <button className="rounded-full border border-border-input px-4 py-2 text-[12px] font-semibold text-text-secondary hover:bg-surface-hover">
                Change photo
              </button>
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
            <p className="mb-4 text-right text-[10.5px] text-text-muted">{bio.length}/250</p>

            <label htmlFor="edit-city" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
              City
            </label>
            <input
              id="edit-city"
              value={city}
              onChange={(e) => markDirty(setCity)(e.target.value)}
              className="w-full rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary font-sans"
            />
          </FieldGroup>

          <FieldGroup title="Travel Preferences">
            <label htmlFor="edit-style" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
              Travel style
            </label>
            <input
              id="edit-style"
              value={travelStyle}
              onChange={(e) => markDirty(setTravelStyle)(e.target.value)}
              placeholder="e.g. Slow travel, offbeat trails"
              className="w-full rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary font-sans"
            />
          </FieldGroup>

          <FieldGroup title="Emergency Contact">
            <p className="mb-3 text-[11px] text-text-muted">
              Never shown on your profile — visible only to GoTogether for safety purposes.
            </p>
            <label htmlFor="edit-ec-name" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
              Contact name
            </label>
            <input
              id="edit-ec-name"
              value={emergencyName}
              onChange={(e) => markDirty(setEmergencyName)(e.target.value)}
              className="mb-4 w-full rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary font-sans"
            />
            <label htmlFor="edit-ec-phone" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
              Contact phone
            </label>
            <input
              id="edit-ec-phone"
              value={emergencyPhone}
              onChange={(e) => markDirty(setEmergencyPhone)(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary font-sans"
            />
          </FieldGroup>

          {dirty && (
            <p className="mb-3 text-[11.5px] font-medium text-text-tertiary">
              You have unsaved changes to your profile
            </p>
          )}

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
