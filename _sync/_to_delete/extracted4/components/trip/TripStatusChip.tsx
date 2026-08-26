"use client";

import { useTripRelationship } from "@/lib/trip-relationship";

/**
 * "You're going" chip — new for the participant view, per the Participant
 * Trip Experience visual spec: sits inline with the lifecycle status pill
 * but is a distinct piece of information (membership vs trip lifecycle),
 * so it's rendered with its own clearly different color to avoid the two
 * reading as redundant/conflicting.
 */
export function TripStatusChip({ tripId }: { tripId: string }) {
  const relationship = useTripRelationship(tripId);
  if (relationship !== "member" && relationship !== "host") return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-trust-bg px-2.5 py-1 text-[10px] font-bold text-trust-fg">
      ✓ {relationship === "host" ? "You're hosting" : "You're going"}
    </span>
  );
}
