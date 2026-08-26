"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { StatusPill } from "./StatusPill";
import type { ActiveTrip, PendingRequest } from "@/lib/my-trips-data";

/**
 * PriorityZone — Active trip banner(s) + all Pending/Waiting-List requests,
 * uncapped, per the blueprint's Concept C: "the one thing a pure tab
 * structure can't [do]: a single glanceable answer to 'what needs my
 * attention right now.'" Simply omitted when empty (no placeholder), and
 * explicitly supports more than one simultaneous Active banner per the
 * critique's dual-role edge case, even though MVP data has at most one.
 */
export function PriorityZone({
  active,
  pending,
  onWithdraw,
}: {
  active: ActiveTrip[];
  pending: PendingRequest[];
  onWithdraw: (tripId: string) => void;
}) {
  if (active.length === 0 && pending.length === 0) return null;

  return (
    <div className="mb-9">
      {active.map((trip) => (
        <ActiveBanner key={trip.tripId} trip={trip} />
      ))}
      {pending.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {pending.map((req) => (
            <PendingRow key={req.tripId} request={req} onWithdraw={() => onWithdraw(req.tripId)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveBanner({ trip }: { trip: ActiveTrip }) {
  return (
    <div className="relative mb-3.5 min-h-[130px] overflow-hidden rounded-2xl">
      <Image src={trip.imgSrc} alt="" fill sizes="1200px" className="object-cover" />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, oklch(20% 0.01 255 / 0.72), oklch(20% 0.01 255 / 0.15))" }}
      />
      <div className="relative flex min-h-[130px] flex-col items-start justify-center gap-3.5 px-6 py-5 min-[500px]:flex-row min-[500px]:items-center min-[500px]:justify-between min-[500px]:gap-4 min-[500px]:py-0">
        <div>
          <div className="mb-1.5">
            <StatusPill tone="progress">Trip in progress</StatusPill>
          </div>
          <div className="font-display text-base font-bold text-white">{trip.title}</div>
        </div>
        <Link
          href={`/trips/${trip.tripId}`}
          className="flex-none rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-[oklch(30%_0.15_255)] hover:opacity-90"
        >
          Open Trip Chat
        </Link>
      </div>
    </div>
  );
}

function PendingRow({ request, onWithdraw }: { request: PendingRequest; onWithdraw: () => void }) {
  const [withdrawn, setWithdrawn] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (withdrawn) return null;

  const statusLabel =
    request.status === "waitlist" ? `Waiting List · #${request.waitlistPosition}` : "Awaiting response";

  function handleWithdraw() {
    setConfirming(false);
    setWithdrawn(true);
    onWithdraw();
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-surface-tint p-3.5 min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between">
      <div>
        <Link href={`/trips/${request.tripId}`} className="text-[13px] font-bold text-text-primary hover:text-primary">
          {request.title}
        </Link>
        <div className="text-[11px] text-text-muted">
          {request.dates} · {request.organizer}
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <StatusPill tone={request.status === "waitlist" ? "waitlist" : "pending"}>{statusLabel}</StatusPill>
        {confirming ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] text-text-muted">Withdraw request?</span>
            <button
              onClick={handleWithdraw}
              className="rounded-full bg-danger px-3 py-1.5 text-[11px] font-semibold text-white"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-full bg-surface-hover px-3 py-1.5 text-[11px] font-semibold text-text-secondary"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-full bg-surface-hover px-3.5 py-2 text-[11.5px] font-semibold text-text-secondary hover:bg-border-soft"
          >
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
}
