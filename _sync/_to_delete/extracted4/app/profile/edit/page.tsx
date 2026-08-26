import type { Metadata } from "next";
import { EditProfileClient } from "./EditProfileClient";

export const metadata: Metadata = {
  title: "Edit Profile — GoTogether",
};

export default function EditProfilePage() {
  return <EditProfileClient />;
}
