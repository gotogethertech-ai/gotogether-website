import { ErrorPageLayout } from "@/components/ui/ErrorPageLayout";

/**
 * Next.js's file-convention 404 — catches any unmatched route, per
 * "GoTogether 404 Page.dc.html". Distinct from Access Denied: this implies
 * the resource doesn't exist or was removed, not a permissions gate.
 */
export default function NotFound() {
  return (
    <ErrorPageLayout
      icon="🌆"
      iconTint="bg-[oklch(95%_0.03_255)]"
      heading="This page has wandered off"
      body="The trip, page, or profile you're looking for doesn't exist, or may have been removed."
      primaryLabel="Explore Trips"
      primaryHref="/explore"
    />
  );
}
