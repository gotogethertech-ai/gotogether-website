import type { Metadata } from "next";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = { title: "Dashboard — Admin — GoTogether" };

export default function AdminDashboardPage() {
  return <DashboardClient />;
}
