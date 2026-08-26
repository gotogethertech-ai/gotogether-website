import type { Metadata } from "next";
import { Suspense } from "react";
import { TravelCompaniesClient } from "./TravelCompaniesClient";

export const metadata: Metadata = {
  title: "Verified Travel Companies — GoTogether",
};

export default function TravelCompaniesPage() {
  return (
    <Suspense fallback={null}>
      <TravelCompaniesClient />
    </Suspense>
  );
}
