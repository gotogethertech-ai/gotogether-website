import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClickDetail } from "@/lib/real-clicks-feed";
import { ClickDetailClient } from "./ClickDetailClient";

// New Clicks publish continuously — not a fixed catalog to pre-render at
// build time, so this always renders on demand (dynamicParams, no
// generateStaticParams list), same approach as /trips/[id] and
// /profile/[slug].
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const click = await getClickDetail(id);
  if (!click) return { title: "Click not found — GoTogether" };

  // Spec section 21: shareable metadata, no private user info exposed —
  // author name/cover image/destination are already public on a
  // published Click, nothing here goes beyond what the page itself shows.
  const description = `A travel story from ${click.author.name}'s ${click.destination ?? "trip"}.`;
  return {
    title: `${click.title} | GoTogether`,
    description,
    openGraph: {
      title: `${click.title} | GoTogether`,
      description,
      images: click.coverImageUrl ? [{ url: click.coverImageUrl }] : undefined,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${click.title} | GoTogether`,
      description,
      images: click.coverImageUrl ? [click.coverImageUrl] : undefined,
    },
  };
}

export default async function ClickDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const click = await getClickDetail(id);
  if (!click) notFound();

  return <ClickDetailClient click={click} />;
}
