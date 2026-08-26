import type { Metadata } from "next";
import { AuditLogClient } from "./AuditLogClient";

export const metadata: Metadata = { title: "Audit Log — Admin — GoTogether" };

export default function AdminAuditLogPage() {
  return <AuditLogClient />;
}
