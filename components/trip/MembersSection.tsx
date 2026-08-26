"use client";

import { useState } from "react";
import Link from "next/link";
import { useTripRelationship } from "@/lib/trip-relationship";
import { Avatar } from "@/components/Avatar";
import { MembersPreview } from "./MembersPreview";
import type { TripMemberInfo } from "@/lib/trip-details";

const MOCK_MEMBER_NAMES = [
  "Kabir Rathi",
  "Sana Verma",
  "Ishaan Dutta",
  "Priya Nair",
  "Vikram Joshi",
  "Anaya Pillai",
];

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Members section — the FULL, named, clickable member list, visible to
 * any visitor (not just accepted members/host). Anyone can view any
 * member's profile by clicking their name/photo, same as clicking through
 * from a review or the organizer card elsewhere on this page. Falls back
 * to the compact avatar-stack MembersPreview only when there's no real
 * member data available at all (e.g. joined <= 1, nothing to list).
 */
export function MembersSection({
  tripId,
  joined,
  max,
  members,
}: {
  tripId: string;
  joined: number;
  max: number;
  /** Real accepted members (organizer excluded), when known — e.g. from a
   * real Supabase-backed trip. Falls back to mock names when omitted, for
   * the mock trip pages that have no real backend yet. */
  members?: TripMemberInfo[];
}) {
  const relationship = useTripRelationship(tripId);
  const [expanded, setExpanded] = useState(false);

  const realMembers = members !== undefined;
  const rows: TripMemberInfo[] = realMembers
    ? members
    : MOCK_MEMBER_NAMES.slice(0, Math.max(0, joined - 1)).map((name) => ({ id: name, name }));

  if (rows.length === 0) {
    return <MembersPreview joined={joined} max={max} />;
  }

  const visible = expanded ? rows : rows.slice(0, 6);
  const hasMore = rows.length > visible.length;

  return (
    <div>
      <div className="mb-3 text-[12.5px] text-text-tertiary">
        {joined} of {max} joined
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-xl bg-surface-tint px-3.5 py-2.5">
          <div
            className="h-8.5 w-8.5 flex-none rounded-full bg-surface-avatar"
            style={{ width: 34, height: 34 }}
            aria-hidden="true"
          />
          <span className="text-[12.5px] font-bold text-primary">
            {relationship === "host" ? "You (Organizer)" : "Organizer"}
          </span>
        </div>
        {visible.map((m) => (
          <Link
            key={m.id}
            href={`/profile/${encodeURIComponent(realMembers ? m.id : m.name)}`}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 hover:bg-surface-hover"
          >
            <Avatar avatarUrl={m.avatarUrl} initials={initialsFrom(m.name)} size={34} className="text-[12px] font-semibold" />
            <span className="text-[12.5px] font-semibold">{m.name}</span>
            <span className="text-[10px] font-bold text-text-muted">Member</span>
          </Link>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-[11.5px] font-semibold text-primary hover:underline"
        >
          View all {rows.length + 1} members →
        </button>
      )}
    </div>
  );
}
