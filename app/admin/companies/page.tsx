import type { Metadata } from "next";
import { CompaniesClient } from "./CompaniesClient";

export const metadata: Metadata = { title: "Companies — Admin — GoTogether" };

export default function AdminCompaniesPage() {
  return <CompaniesClient />;
}
