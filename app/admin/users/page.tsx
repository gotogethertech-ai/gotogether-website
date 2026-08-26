import type { Metadata } from "next";
import { UsersListClient } from "./UsersListClient";

export const metadata: Metadata = { title: "Users — Admin — GoTogether" };

export default function AdminUsersPage() {
  return <UsersListClient />;
}
