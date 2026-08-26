import type { Metadata } from "next";
import { Suspense } from "react";
import { DestinationsClient } from "./DestinationsClient";

export const metadata: Metadata = {
  title: "Explore Destinations — GoTogether",
};

export default function DestinationsPage() {
  return (
    <Suspense fallback={null}>
      <DestinationsClient />
    </Suspense>
  );
}
