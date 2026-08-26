import type { Metadata } from "next";
import { TripDetailClient } from "./TripDetailClient";

export const metadata: Metadata = { title: "Trip — Admin — GoTogether" };
export const dynamicParams = true;

export default async function AdminTripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripDetailClient tripId={id} />;
}
