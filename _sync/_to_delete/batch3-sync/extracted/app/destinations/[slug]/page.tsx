import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { destinationsCatalog, getDestinationBySlug } from "@/lib/destinations-catalog";
import { DestinationDetailsClient } from "./DestinationDetailsClient";

export function generateStaticParams() {
  return destinationsCatalog.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const destination = getDestinationBySlug(slug);
  if (!destination) return { title: "Destination not found — GoTogether" };
  return {
    title: `${destination.name} — GoTogether`,
    description: destination.brief,
  };
}

export default async function DestinationDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = getDestinationBySlug(slug);
  if (!destination) notFound();

  return <DestinationDetailsClient destination={destination} />;
}
