"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { tripChats, directMessages, type TripChat } from "@/lib/chat-data";

/**
 * Trip Chats — two-pane layout per "GoTogether Chat List Page.dc.html":
 * conversation list (trip group chats, then direct messages) + active
 * thread. An empty-inbox state is added here since the design doc doesn't
 * specify one (flagged gap) — "No trips yet" fallback, consistent with
 * the rest of the site's honest-empty-state pattern.
 */
export function ChatListClient() {
  const { isLoggedIn, requireAuth } = useAuth();
  const [authChecked, setAuthChecked] = useState(() => isLoggedIn);
  const [activeId, setActiveId] = useState<string | null>(tripChats[0]?.tripId ?? null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (isLoggedIn) return;
    requireAuth("view your messages", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authChecked) {
    return (
      <>
        <Header activePath="/" />
        <main className="flex-1 bg-surface" />
      </>
    );
  }

  const active = tripChats.find((c) => c.tripId === activeId) ?? null;
  const isEmpty = tripChats.length === 0 && directMessages.length === 0;

  return (
    <>
      <Header activePath="/" />
      <main className="flex-1 bg-surface">
        {isEmpty ? (
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

              {tripChats.length > 0 && (
                <div className="px-4">
                  <div className="mb-2 text-[10.5px] font-bold tracking-wide text-text-muted uppercase">
                    Group chats
                  </div>
                  <div className="flex flex-col gap-1">
                    {tripChats.map((chat) => (
                      <ConversationRow
                        key={chat.tripId}
                        chat={chat}
                        active={chat.tripId === activeId}
                        onClick={() => setActiveId(chat.tripId)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {directMessages.length > 0 && (
                <div className="mt-4 px-4">
                  <div className="mb-2 text-[10.5px] font-bold tracking-wide text-text-muted uppercase">
                    Direct messages
                  </div>
                  <div className="flex flex-col gap-1">
                    {directMessages.map((dm) => (
                      <div key={dm.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-hover">
                        <div
                          className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-surface-avatar text-[11px] font-semibold text-[oklch(40%_0.1_255)]"
                          style={{ width: 36, height: 36 }}
                        >
                          {dm.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold">{dm.name}</div>
                          <div className="truncate text-[11px] text-text-muted">{dm.lastMessage}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

                  <div className="flex-1 overflow-y-auto p-5">
                    <div className="flex flex-col gap-3">
                      {active.messages.map((m) => (
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
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setDraft("");
                    }}
                    className="flex items-center gap-2 border-t border-border-divider p-4"
                  >
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Message the group..."
                      className="flex-1 rounded-full border border-border-input bg-surface-tint px-4 py-2.5 text-[12.5px] outline-none focus:border-primary font-sans"
                    />
                    <button
                      type="submit"
                      aria-label="Send"
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary text-white hover:opacity-90"
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
