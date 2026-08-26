import type { Metadata } from "next";
import { Suspense } from "react";
import { LoggedInHomeClient } from "./LoggedInHomeClient";

export const metadata: Metadata = {
  title: "Home — GoTogether",
};

export default function LoggedInHomePage() {
  return (
    <Suspense>
      <LoggedInHomeClient />
    </Suspense>
  );
}
