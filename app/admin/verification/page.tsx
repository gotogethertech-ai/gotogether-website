import type { Metadata } from "next";
import { VerificationQueueClient } from "./VerificationQueueClient";

export const metadata: Metadata = { title: "Verification — Admin — GoTogether" };

export default function AdminVerificationPage() {
  return <VerificationQueueClient />;
}
