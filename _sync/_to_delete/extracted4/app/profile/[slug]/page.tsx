import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProfileSlugs, getProfile } from "@/lib/profiles-data";
import { PublicProfileClient } from "./PublicProfileClient";

export function generateStaticParams() {
  return getAllProfileSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile) return { title: "Profile not found — GoTogether" };
  return { title: `${profile.name} — GoTogether` };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getProfile(slug);
  if (!profile) notFound();

  return <PublicProfileClient profile={profile} />;
}
