"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import type { TripChat, ChatMessage } from "@/lib/chat-data";
import {
  getMyTripChats,
  getRoomIdForTrip,
  getRoomMessages,
  sendMessage,
  subscribeToRoomMessages,
  getSenderName,
} from "@/lib/real-chat";

/**
 * Trip Chats — two-pane layout per "GoTogether Chat List Page.dc.html":
 * conversation list (trip group chats) + active thread. Now backed by
 * real chat_rooms/chat_participants/messages tables (see
 * lib/real-chat.ts and migration 013) instead of lib/chat-data.ts's
 * hardcoded Manali/Rishikesh/Spiti/Goa sample conversations — every
 * accepted trip member gets a real, working group chat automatically.
 *
 * Direct messages aren't provisioned by any UI yet (no "message this
 * person" entry point exists), so that section is simply omitted rather
 * than showing a fake contact.
 */
export function ChatListClient() {
  const { user, isLoggedIn, requireAuth } = useAuth();
  const [authChecked, setAuthChecked] = useState(() => isLoggedIn);
  const [chats, setChats] = useState<TripChat[]>([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoggedIn) return;
    requireAuth("view your messages", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyTripChats(user.id).then((list) => {
      if (cancelled) return;
      setChats(list);
      setChatsLoaded(true);
      if (list.length > 0) setActiveTripId(list[0].tripId);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load the room + message history whenever the active trip changes, and
  // subscribe to new messages arriving in real time via Supabase Realtime.
  useEffect(() => {
    if (!activeTripId || !user) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    Promise.resolve()
      .then(() => {
        if (cancelled) return;
        setActiveRoomId(null);
        setMessages([]);
      })
      .then(() => getRoomIdForTrip(activeTripId))
      .then(async (roomId) => {
        if (cancelled || !roomId) return;
        setActiveRoomId(roomId);
        const history = await getRoomMessages(roomId, user.id);
        if (cancelled) return;
        setMessages(history);

        unsubscribe = subscribeToRoomMessages(roomId, (row) => {
          const fromSelf = row.sender_id === user.id;
          const append = (senderName: string | undefined) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [...prev, { id: row.id, fromSelf, senderName, text: row.body }];
            });
          };
          if (fromSelf) {
            append(undefined);
          } else {
            getSenderName(row.sender_id).then(append);
          }
        });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [activeTripId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  if (!authChecked) {
    return (
      <>
        <Header activePath="/" />
        <main className="flex-1 bg-surface" />
      </>
    );
  }

  const active = chats.find((c) => c.tripId === activeTripId) ?? null;
  const isEmpty = chatsLoaded && chats.length === 0;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRoomId || !user || !draft.trim() || sending) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);
    try {
      await sendMessage(activeRoomId, user.id, text);
      // No optimistic append — the Realtime subscription above delivers
      // this same insert back, keeping a single source of truth for
      // message order (seq) instead of a client-side guess.
    } catch (err) {
      console.error("Failed to send message:", err);
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Header activePath="/" />
      <main className="flex-1 bg-surface">
        {!chatsLoaded ? (
          <div className="mx-auto max-w-[1000px] py-24" />
        ) : isEmpty ? (
          <div className="mx-auto flex max-w-[600px] flex-col items-center gap-3 px-8 py-24 text-center">
            <p className="text-[13.5px] text-text-tertiary">
              No trips yet — join or create a trip to start chatting with your group.
            </p>
            <Link href="/explore" className="rounded-full bg-primary px-6 py-3 text-[13px] font-semibold text-white hover:opacity-90">
              Explore Trips
            </Link>
          </div>
        ) : (
          <div className="mx-auto flex max-w-[1000px]" style={{ height: "calc(100vh - 73px)" }}>
            {/* Left pane — conversation list */}
            <div className="w-[340px] flex-none overflow-y-auto border-r border-border-divider">
              <div className="px-4 py-4">
                <h1 className="font-display text-lg font-bold">Trip Chats</h1>
              </div>

              <div className="px-4">
                <div className="mb-2 text-[10.5px] font-bold tracking-wide text-text-muted uppercase">
                  Group chats
                </div>
                <div className="flex flex-col gap-1">
                  {chats.map((chat) => (
                    <ConversationRow
                      key={chat.tripId}
                      chat={chat}
                      active={chat.tripId === activeTripId}
                      onClick={() => setActiveTripId(chat.tripId)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right pane — active conversation */}
            <div className="flex flex-1 flex-col">
              {active ? (
                <>
                  <div className="border-b border-border-divider px-5 py-3.5">
                    <div className="text-[15px] font-bold">{active.title}</div>
                    <div className="text-[11px] text-text-muted">
                      {active.subtitle} ·{" "}
                      <Link href={`/trips/${active.tripId}`} className="font-semibold text-primary hover:underline">
                        View Trip
                      </Link>
                    </div>
                  </div>

                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
                    {messages.length === 0 ? (
                      <p className="text-[12.5px] text-text-tertiary">
                        No messages yet — say hello to the group.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {messages.map((m) => (
                          <div key={m.id} className={`flex ${m.fromSelf ? "justify-end" : "justify-start"}`}>
                            <div className="max-w-[60%]">
                              {!m.fromSelf && m.senderName && (
                                <div className="mb-1 text-[10.5px] text-text-muted">{m.senderName}</div>
                              )}
                              <div
                                className={`rounded-2xl px-3.5 py-2.5 text-[12.5px] ${
                                  m.fromSelf ? "bg-primary text-white" : "bg-surface-tint text-text-primary"
                                }`}
                              >
                                {m.text}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border-divider p-4">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Message the group..."
                      className="flex-1 rounded-full border border-border-input bg-surface-tint px-4 py-2.5 text-[12.5px] outline-none focus:border-primary font-sans"
                    />
                    <button
                      type="submit"
                      aria-label="Send"
                      disabled={sending || !draft.trim()}
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary text-white hover:opacity-90 disabled:opacity-50"
                    >
                      ↑
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-[12.5px] text-text-tertiary">
                  Select a conversation
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function ConversationRow({
  chat,
  active,
  onClick,
}: {
  chat: TripChat;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-2 py-2.5 text-left ${active ? "bg-[oklch(94%_0.05_255)]" : "hover:bg-surface-hover"}`}
    >
      <div className="relative flex-none">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-[oklch(93%_0.03_255)]"
          style={{ width: 44, height: 44 }}
          aria-hidden="true"
        />
        <span
          className={`absolute -bottom-1 -left-1 rounded-md px-1 text-[8.5px] font-bold ${
            chat.badgeVariant === "partner" ? "bg-[oklch(94%_0.05_45)] text-[oklch(45%_0.1_45)]" : "bg-surface text-text-tertiary border border-border"
          }`}
        >
          {chat.badge}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-bold">{chat.title}</span>
          <span className="flex-none text-[10px] text-text-muted">{chat.time}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11.5px] text-text-muted">{chat.lastMessage}</span>
          {chat.unread > 0 && (
            <span className="flex h-4 min-w-4 flex-none items-center justify-center rounded-full bg-badge-bg px-1 text-[9px] font-bold text-white">
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
