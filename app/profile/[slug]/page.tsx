import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProfileSlugs, getProfile } from "@/lib/profiles-data";
import { getRealProfileByIdServer, looksLikeUserId } from "@/lib/real-profile-server";
import { PublicProfileClient } from "./PublicProfileClient";

// Real Supabase user ids aren't known at build time (unlike the fixed set
// of mock profile slugs below), so this route can't be fully static — a
// real-id request is rendered on demand.
export const dynamicParams = true;

// dynamicParams alone isn't enough: Next.js still attempts a static/ISR
// pass for any param outside generateStaticParams()'s fixed mock-slug
// list, and resolveProfile()'s real-id branch calls cookies() (via
// createServerSupabaseClient in real-profile-server.ts) to read the
// session. Calling cookies() during that attempted static pass throws
// DYNAMIC_SERVER_USAGE instead of falling back gracefully — this is what
// produced the "500: This page couldn't load" for every real user's
// profile (any id not in the mock set) while the mock-slug and self
// profiles kept working. Forcing the route dynamic skips the static
// attempt entirely, which is correct anyway since a live DB lookup is
// exactly what this route needs on every request.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getAllProfileSlugs().map((slug) => ({ slug }));
}

async function resolveProfile(slug: string) {
  if (looksLikeUserId(slug)) return getRealProfileByIdServer(slug);
  return getProfile(slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await resolveProfile(slug);
  if (!profile) return { title: "Profile not found — GoTogether" };
  return { title: `${profile.name} — GoTogether` };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await resolveProfile(slug);
  if (!profile) notFound();

  return <PublicProfileClient profile={profile} />;
}
