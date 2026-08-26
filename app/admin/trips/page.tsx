import type { Metadata } from "next";
import { TripsListClient } from "./TripsListClient";

export const metadata: Metadata = { title: "Trips — Admin — GoTogether" };

export default function AdminTripsPage() {
  return <TripsListClient />;
}
