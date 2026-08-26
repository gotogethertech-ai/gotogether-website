"use client";

import { useState } from "react";
import Link from "next/link";
import { useTripRelationship } from "@/lib/trip-relationship";
import { MembersPreview } from "./MembersPreview";

const AVATAR_TONES = [
  "oklch(85% 0.03 255)",
  "oklch(88% 0.04 185)",
  "oklch(90% 0.03 45)",
  "oklch(86% 0.03 255)",
  "oklch(88% 0.03 320)",
  "oklch(87% 0.04 120)",
];

const MOCK_MEMBER_NAMES = [
  "Kabir Rathi",
  "Sana Verma",
  "Ishaan Dutta",
  "Priya Nair",
  "Vikram Joshi",
  "Anaya Pillai",
];

/**
 * Members section — capped preview (avatars + count) for a public visitor
 * or pending applicant, but the FULL, uncapped list once you've joined
 * (Accepted Member or Host), per the Participant Trip Experience
 * Blueprint's "New, available only after joining" content category.
 */
export function MembersSection({
  tripId,
  joined,
  max,
}: {
  tripId: string;
  joined: number;
  max: number;
}) {
  const relationship = useTripRelationship(tripId);
  const [expanded, setExpanded] = useState(false);

  if (relationship !== "member" && relationship !== "host") {
    return <MembersPreview joined={joined} max={max} />;
  }

  const names = MOCK_MEMBER_NAMES.slice(0, Math.max(0, joined - 1));
  const visible = expanded ? names : names.slice(0, 6);
  const hasMore = names.length > visible.length;

  return (
    <div>
      <div className="mb-3 text-[12.5px] text-text-tertiary">
        {joined} of {max} joined
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-xl bg-surface-tint px-3.5 py-2.5">
          <div
            className="h-8.5 w-8.5 flex-none rounded-full"
            style={{ width: 34, height: 34, background: AVATAR_TONES[0] }}
            aria-hidden="true"
          />
          <span className="text-[12.5px] font-bold text-primary">
            {relationship === "host" ? "You (Organizer)" : "Organizer"}
          </span>
        </div>
        {visible.map((name, i) => (
          <Link
            key={name}
            href={`/profile/${encodeURIComponent(name)}`}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 hover:bg-surface-hover"
          >
            <div
              className="h-8.5 w-8.5 flex-none rounded-full"
              style={{ width: 34, height: 34, background: AVATAR_TONES[(i + 1) % AVATAR_TONES.length] }}
              aria-hidden="true"
            />
            <span className="text-[12.5px] font-semibold">{name}</span>
            <span className="text-[10px] font-bold text-text-muted">Member</span>
          </Link>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-[11.5px] font-semibold text-primary hover:underline"
        >
          View all {names.length + 1} members →
        </button>
      )}
    </div>
  );
}
