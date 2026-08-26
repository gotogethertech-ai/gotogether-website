import type { Metadata } from "next";
import { Suspense } from "react";
import { MyTripsClient } from "./MyTripsClient";

export const metadata: Metadata = {
  title: "My Trips — GoTogether",
};

export default function MyTripsPage() {
  return (
    <Suspense fallback={null}>
      <MyTripsClient />
    </Suspense>
  );
}
