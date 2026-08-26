import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProfileSlugs, getProfile } from "@/lib/profiles-data";
import { getRealProfileByIdServer, looksLikeUserId } from "@/lib/real-profile-server";
import { PublicProfileClient } from "./PublicProfileClient";

// Real Supabase user ids aren't known at build time (unlike the fixed set
// of mock profile slugs below), so this route can't be fully static — a
// real-id request is rendered on demand.
export const dynamicParams = true;

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
