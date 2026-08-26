import type { Metadata } from "next";
import { HistoryClient } from "./HistoryClient";

export const metadata: Metadata = {
  title: "Travel History — GoTogether",
};

export default function HistoryPage() {
  return <HistoryClient />;
}
