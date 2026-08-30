import type { Metadata } from "next";
import { SiteSettingsClient } from "./SiteSettingsClient";

export const metadata: Metadata = { title: "Settings — Admin — GoTogether" };

export default function AdminSettingsPage() {
  return <SiteSettingsClient />;
}
