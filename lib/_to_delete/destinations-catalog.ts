import { exploreTrips, featuredTrips, partnerTrips } from "./mock-data";

/**
 * Curated destination catalog for the public Destinations Discovery +
 * Details pages, per the approved Destinations Blueprint: "only what the
 * curated destination system already defines — name, category, a cover
 * image, and the live trips currently available to it." This extends (not
 * replaces) the Create Trip flow's own lib/destinations.ts catalog — that
 * one is scoped to Create Trip's curated-selection-only picker; this one
 * additionally carries the category grouping and live trip counts the
 * public discovery pages need. Restricted to destinations that already
 * have a placeholder image, same site-wide rule as everywhere else.
 */
export type DestinationCategory = "mountains" | "beaches" | "weekend-escapes" | "adventure";

export type CatalogDestination = {
  slug: string;
  name: string;
  imgSrc: string;
  category: DestinationCategory;
  popular?: boolean;
  /** One short platform-authored line, all-or-none across destinations per
   * the blueprint's critique fix — every destination here has one. */
  brief: string;
};

export const CATEGORY_META: Record<DestinationCategory, { label: string; icon: string }> = {
  mountains: { label: "Mountains", icon: "🏔️" },
  beaches: { label: "Beaches", icon: "🏖️" },
  "weekend-escapes": { label: "Weekend Escapes", icon: "🌿" },
  adventure: { label: "Adventure", icon: "🏕️" },
};

export const destinationsCatalog: CatalogDestination[] = [
  {
    slug: "manali",
    name: "Manali",
    imgSrc: "/placeholders/manali.svg",
    category: "mountains",
    popular: true,
    brief: "One of the most popular Himalayan getaways for travellers from Delhi NCR — snow treks, café culture, and weekend escapes.",
  },
  {
    slug: "kasol",
    name: "Kasol",
    imgSrc: "/placeholders/kasol.svg",
    category: "mountains",
    popular: true,
    brief: "A riverside backpacker town in the Parvati Valley, known for its cafés and easy access to nearby treks.",
  },
  {
    slug: "spiti",
    name: "Spiti Valley",
    imgSrc: "/placeholders/spiti.svg",
    category: "mountains",
    popular: true,
    brief: "A high-altitude cold desert valley for travellers looking for a longer, more remote Himalayan expedition.",
  },
  {
    slug: "leh-ladakh",
    name: "Leh-Ladakh",
    imgSrc: "/placeholders/leh-ladakh.svg",
    category: "mountains",
    popular: true,
    brief: "Dramatic high-altitude landscapes and long mountain roads, popular for multi-day bike and group tours.",
  },
  {
    slug: "mussoorie",
    name: "Mussoorie",
    imgSrc: "/placeholders/mussoorie.svg",
    category: "weekend-escapes",
    brief: "A classic hill-station escape from Delhi NCR, easy to reach for a short weekend trip.",
  },
  {
    slug: "goa",
    name: "Goa",
    imgSrc: "/placeholders/goa.svg",
    category: "beaches",
    popular: true,
    brief: "Beaches, nightlife, and group getaways on India's west coast — a favourite for weekend and week-long trips alike.",
  },
  {
    slug: "rishikesh",
    name: "Rishikesh",
    imgSrc: "/placeholders/rishikesh.svg",
    category: "weekend-escapes",
    brief: "River rafting, yoga, and riverside camps on the banks of the Ganges, a short drive from Delhi NCR.",
  },
  {
    slug: "jaipur",
    name: "Jaipur",
    imgSrc: "/placeholders/jaipur.svg",
    category: "weekend-escapes",
    brief: "Forts, palaces, and old-city culture — a heritage-focused weekend trip from Delhi NCR.",
  },
  {
    slug: "bir",
    name: "Bir",
    imgSrc: "/placeholders/bir.svg",
    category: "adventure",
    brief: "India's paragliding capital, set against the Dhauladhar range in Himachal Pradesh.",
  },
];

export function getDestinationBySlug(slug: string): CatalogDestination | undefined {
  return destinationsCatalog.find((d) => d.slug === slug);
}

export function getDestinationsByCategory(category: DestinationCategory): CatalogDestination[] {
  return destinationsCatalog.filter((d) => d.category === category);
}

export function getPopularDestinations(): CatalogDestination[] {
  return destinationsCatalog.filter((d) => d.popular);
}

/** Live trip count for a destination, computed from the same mock trip
 * pools every other page already draws from — no fabricated numbers. */
export function getTripCountForDestination(name: string): number {
  const inExplore = exploreTrips.filter((t) => t.destination.toLowerCase() === name.toLowerCase()).length;
  if (inExplore > 0) return inExplore;
  const inFeatured = featuredTrips.filter((t) => t.imgAlt.toLowerCase() === name.toLowerCase()).length;
  const inPartner = partnerTrips.filter((t) => t.imgAlt.toLowerCase() === name.toLowerCase()).length;
  return inFeatured + inPartner;
}

export function searchDestinationsCatalog(query: string): CatalogDestination[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return destinationsCatalog.filter((d) => d.name.toLowerCase().includes(q));
}

/** Related destinations: same category, excluding self — per the
 * blueprint's cheap-to-compute-from-existing-category-data rule. */
export function getRelatedDestinations(slug: string, max = 4): CatalogDestination[] {
  const current = getDestinationBySlug(slug);
  if (!current) return [];
  return destinationsCatalog.filter((d) => d.category === current.category && d.slug !== slug).slice(0, max);
}
