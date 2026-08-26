import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveDestinations, getDestinationBySlug } from "@/lib/destinations-server";
import { DestinationDetailsClient } from "./DestinationDetailsClient";

export async function generateStaticParams() {
  const destinations = await getActiveDestinations();
  return destinations.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) return { title: "Destination not found — GoTogether" };
  return {
    title: `${destination.name} — GoTogether`,
    description: destination.tagline ?? destination.description ?? undefined,
  };
}

export default async function DestinationDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  return <DestinationDetailsClient destination={destination} />;
}
