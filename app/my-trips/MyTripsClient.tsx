"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PriorityZone } from "@/components/my-trips/PriorityZone";
import { GoingTab } from "@/components/my-trips/GoingTab";
import { HostingTab } from "@/components/my-trips/HostingTab";
import { useAuth } from "@/lib/auth-context";
import type {
  HostedTrip,
  ActiveTrip,
  PendingRequest,
  UpcomingTrip,
  PastGoingTrip,
  RecentRequest,
} from "@/lib/my-trips-data";
import { getMyHostedTrips } from "@/lib/real-trips";
import { getMyGoingTrips, withdrawJoinRequest } from "@/lib/real-going-trips";

type TabKey = "going" | "hosting";

/**
 * My Trips — Concept C from the approved blueprint: a Priority zone
 * (Active trip + all Pending/Waiting-List requests, uncapped) above two
 * role-based tabs, Going and Hosting. Active tab is URL-persisted
 * (?tab=going|hosting) per the blueprint's Interactions spec, so a
 * bookmarked/shared link reproduces the same view.
 *
 * Both tabs now read real Supabase data (see lib/real-trips.ts for
 * Hosting, lib/real-going-trips.ts for Going/Priority zone) — no
 * hardcoded sample trips anywhere on this page.
 */
export function MyTripsClient() {
  const { user, isLoggedIn, requireAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(() => isLoggedIn);
  const [hostedTrips, setHostedTrips] = useState<HostedTrip[]>([]);
  const [active, setActive] = useState<ActiveTrip[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>([]);
  const [pastGoingTrips, setPastGoingTrips] = useState<PastGoingTrip[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (isLoggedIn) return;
    requireAuth("view your trips", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([getMyHostedTrips(user.id), getMyGoingTrips(user.id)]).then(([hosted, going]) => {
      if (cancelled) return;
      setHostedTrips(hosted);
      setActive(going.active);
      setPending(going.pending);
      setUpcomingTrips(going.upcoming);
      setPastGoingTrips(going.past);
      setRecentRequests(going.recentRequests);
      setDataLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = tabParam === "hosting" ? "hosting" : "going";

  function setTab(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/my-trips?${params.toString()}`, { scroll: false });
  }

  function handleWithdraw(tripId: string) {
    setPending((prev) => prev.filter((p) => p.tripId !== tripId));
    if (user) {
      withdrawJoinRequest(tripId, user.id).catch((err) => {
        console.error("Failed to withdraw join request:", err);
      });
    }
  }

  if (!authChecked || !dataLoaded) {
    return (
      <>
        <Header activePath="/my-trips" />
        <main className="flex-1 bg-surface">
          <div className="mx-auto max-w-(--section-max-width) px-8 py-8 pb-20 max-[599px]:px-4">
            <h1 className="mb-6 font-display text-[26px] font-bold">My Trips</h1>
            <div className="flex flex-col gap-4" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[110px] animate-pulse rounded-2xl bg-surface-hover" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const isBrandNew =
    active.length === 0 &&
    pending.length === 0 &&
    upcomingTrips.length === 0 &&
    pastGoingTrips.length === 0 &&
    hostedTrips.length === 0;

  return (
    <>
      <Header activePath="/my-trips" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-(--section-max-width) px-8 py-8 pb-20 max-[599px]:px-4">
          <h1 className="mb-6 font-display text-[26px] font-bold">My Trips</h1>

          {isBrandNew ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-tint px-6 py-16 text-center">
              <p className="max-w-[360px] text-[14px] text-text-tertiary">
                You haven&apos;t joined or created a trip yet.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/explore" className="rounded-full bg-primary px-6 py-3 text-[13px] font-semibold text-white hover:opacity-90">
                  Explore Trips
                </Link>
                <Link href="/create-trip" className="rounded-full bg-accent px-6 py-3 text-[13px] font-semibold text-white hover:opacity-90">
                  Create Trip
                </Link>
              </div>
            </div>
          ) : (
            <>
              <PriorityZone active={active} pending={pending} onWithdraw={handleWithdraw} />

              <div role="tablist" aria-label="My Trips sections" className="mb-6 flex gap-7 border-b border-border-divider">
                <TabButton id="tab-going" panelId="panel-going" active={activeTab === "going"} onClick={() => setTab("going")}>
                  Going
                </TabButton>
                <TabButton id="tab-hosting" panelId="panel-hosting" active={activeTab === "hosting"} onClick={() => setTab("hosting")}>
                  Hosting
                </TabButton>
              </div>

              {activeTab === "going" ? (
                <GoingTab upcoming={upcomingTrips} past={pastGoingTrips} recentRequests={recentRequests} />
              ) : (
                <HostingTab trips={hostedTrips} />
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function TabButton({
  id,
  panelId,
  active,
  onClick,
  children,
}: {
  id: string;
  panelId: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      onClick={onClick}
      className={`min-h-[44px] border-b-2 px-1 pb-2.5 text-sm font-semibold ${
        active ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}
