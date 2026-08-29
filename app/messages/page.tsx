import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatListClient } from "./ChatListClient";

export const metadata: Metadata = {
  title: "Trip Chats — GoTogether",
};

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <ChatListClient />
    </Suspense>
  );
}
