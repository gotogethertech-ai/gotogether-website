import type { Metadata } from "next";
import { ChatListClient } from "./ChatListClient";

export const metadata: Metadata = {
  title: "Trip Chats — GoTogether",
};

export default function MessagesPage() {
  return <ChatListClient />;
}
