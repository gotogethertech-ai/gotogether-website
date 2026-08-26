import type { Metadata } from "next";
import { CreateTripClient } from "./CreateTripClient";

export const metadata: Metadata = {
  title: "Create a Trip — GoTogether",
};

export default function CreateTripPage() {
  return <CreateTripClient />;
}
