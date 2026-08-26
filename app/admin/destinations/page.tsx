import type { Metadata } from "next";
import { DestinationsClient } from "./DestinationsClient";

export const metadata: Metadata = { title: "Destinations — Admin — GoTogether" };

export default function AdminDestinationsPage() {
  return <DestinationsClient />;
}
