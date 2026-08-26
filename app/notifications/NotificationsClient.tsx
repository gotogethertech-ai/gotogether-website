"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BellIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth-context";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "@/lib/real-notifications";

/**
 * Notifications — reads public.notifications (see lib/real-notifications.ts
 * for why the table is currently always empty: nothing in the product
 * writes to it yet). Built as a real, working read/mark-read surface now
 * so the header bell (previously a dead button with no onClick at all —
 * see components/Header.tsx) has somewhere real to go, and so this page
 * needs no further UI work once a write path (join requests, waitlist
 * promotions, etc.) starts inserting rows.
 */
export function NotificationsClient() {
  const { user, isLoggedIn, requireAuth } = useAuth();
  const [authChecked, setAuthChecked] = useState(() => isLoggedIn);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isLoggedIn) return;
    requireAuth("view your notifications", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyNotifications(user.id).then((rows) => {
      if (cancelled) return;
      setNotifications(rows);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const hasUnread = notifications.some((n) => !n.read);

  async function handleMarkAllRead() {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead(user.id);
  }

  async function handleOpen(n: Notification) {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      await markNotificationRead(n.id);
    }
  }

  if (!authChecked || !user) {
    return (
      <>
        <Header activePath="/" />
        <main className="flex-1 bg-surface" />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header activePath="/" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[640px] px-8 py-8 pb-20 max-[599px]:px-4">
          <div className="mb-6 flex items-baseline justify-between">
            <h1 className="font-display text-xl font-bold">Notifications</h1>
            {hasUnread && (
              <button
                onClick={handleMarkAllRead}
                className="text-[12.5px] font-semibold text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {!loaded ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-surface-hover" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-divider py-20 text-center">
              <BellIcon size={28} className="text-text-muted" />
              <p className="text-[13.5px] text-text-tertiary">You&apos;re all caught up.</p>
              <p className="max-w-[320px] text-[12px] text-text-muted">
                Join requests, waitlist updates, and trip changes will show up here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((n) => {
                const content = (
                  <div
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${
                      n.read
                        ? "border-border-divider bg-surface"
                        : "border-primary/30 bg-surface-tint"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 flex-none rounded-full ${
                        n.read ? "bg-transparent" : "bg-primary"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold">{n.title}</div>
                      {n.body && (
                        <p className="mt-0.5 text-[12.5px] leading-relaxed text-text-secondary">
                          {n.body}
                        </p>
                      )}
                      <div className="mt-1 text-[11px] text-text-muted">{n.timeAgo}</div>
                    </div>
                  </div>
                );
                return n.relatedTripId ? (
                  <Link key={n.id} href={`/trips/${n.relatedTripId}`} onClick={() => handleOpen(n)}>
                    {content}
                  </Link>
                ) : (
                  <button key={n.id} onClick={() => handleOpen(n)} className="text-left">
                    {content}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
