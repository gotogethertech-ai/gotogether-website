import type { Metadata } from "next";
import { SavedTripsClient } from "./SavedTripsClient";

export const metadata: Metadata = {
  title: "Saved Trips — GoTogether",
};

export default function SavedTripsPage() {
  return <SavedTripsClient />;
}
