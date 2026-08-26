import type { Metadata } from "next";
import { Suspense } from "react";
import { EditProfileClient } from "./EditProfileClient";

export const metadata: Metadata = {
  title: "Edit Profile — GoTogether",
};

export default function EditProfilePage() {
  return (
    <Suspense fallback={null}>
      <EditProfileClient />
    </Suspense>
  );
}
