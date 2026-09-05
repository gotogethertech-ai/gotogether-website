import type { Metadata } from "next";
import { CreateClickClient } from "./CreateClickClient";

export const metadata: Metadata = {
  title: "Create a Click — GoTogether",
};

export default function CreateClickPage() {
  return <CreateClickClient />;
}
