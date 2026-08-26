import type { Metadata } from "next";
import { StatisticsClient } from "./StatisticsClient";

export const metadata: Metadata = {
  title: "Your Statistics — GoTogether",
};

export default function StatisticsPage() {
  return <StatisticsClient />;
}
