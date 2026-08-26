import type { Metadata } from "next";
import { MyProfileClient } from "./MyProfileClient";

export const metadata: Metadata = {
  title: "My Profile — GoTogether",
};

export default function MyProfilePage() {
  return <MyProfileClient />;
}
