import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAllHostedTripIds, getHostedTrip } from "@/lib/host-management-data";
import { HostManagementClient } from "./HostManagementClient";

export function generateStaticParams() {
  return getAllHostedTripIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const trip = getHostedTrip(id);
  if (!trip) return { title: "Trip not found — GoTogether" };
  return { title: `Manage ${trip.title} — GoTogether` };
}

export default async function HostManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = getHostedTrip(id);
  if (!trip) notFound();

  return (
    <Suspense>
      <HostManagementClient tripId={id} />
    </Suspense>
  );
}
