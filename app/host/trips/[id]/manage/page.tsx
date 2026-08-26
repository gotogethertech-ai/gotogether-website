import type { Metadata } from "next";
import { Suspense } from "react";
import { HostManagementClient } from "./HostManagementClient";

// Real trip ids aren't known at build time, and "not found" for a real
// trip is now decided client-side by HostManagementClient (it knows the
// signed-in organizer's id, which a Server Component here doesn't) rather
// than by a page-level mock lookup.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  await params;
  return { title: "Manage Trip — GoTogether" };
}

export default async function HostManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense>
      <HostManagementClient tripId={id} />
    </Suspense>
  );
}
