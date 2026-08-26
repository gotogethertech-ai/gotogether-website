import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getActiveDestinations } from "@/lib/destinations-server";
import { getAllVerifiedCompanySlugsServer } from "@/lib/real-companies-server";

const STATIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "daily" as const },
  { path: "/explore", priority: 0.9, changeFrequency: "hourly" as const },
  { path: "/destinations", priority: 0.8, changeFrequency: "daily" as const },
  { path: "/travel-companies", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/how-it-works", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/trust-safety", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.4, changeFrequency: "monthly" as const },
  { path: "/help", priority: 0.4, changeFrequency: "monthly" as const },
  { path: "/legal/terms", priority: 0.2, changeFrequency: "yearly" as const },
  { path: "/legal/privacy", priority: 0.2, changeFrequency: "yearly" as const },
];

/**
 * Only includes content that's real and durable enough to be worth
 * indexing: static marketing/legal pages, admin-managed destinations, and
 * verified travel companies. Deliberately excludes individual trips
 * (numerous, time-bound — a trip's availability window closes) and
 * profiles (still lib/profiles-data.ts mock slugs, not real accounts) so
 * this never advertises a URL that 404s or misleads a crawler.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinations, companySlugs] = await Promise.all([
    getActiveDestinations(),
    getAllVerifiedCompanySlugsServer(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    priority: r.priority,
    changeFrequency: r.changeFrequency,
  }));

  const destinationEntries: MetadataRoute.Sitemap = destinations.map((d) => ({
    url: `${SITE_URL}/destinations/${d.slug}`,
    lastModified: d.updated_at,
    priority: 0.6,
    changeFrequency: "weekly",
  }));

  const companyEntries: MetadataRoute.Sitemap = companySlugs.map((slug) => ({
    url: `${SITE_URL}/travel-companies/${slug}`,
    priority: 0.5,
    changeFrequency: "weekly",
  }));

  return [...staticEntries, ...destinationEntries, ...companyEntries];
}
