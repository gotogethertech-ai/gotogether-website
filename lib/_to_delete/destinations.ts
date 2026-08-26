/**
 * Curated destination catalog for Create Trip's Destination step, per the
 * Create Trip Blueprint's "controlled catalog... free text is never
 * accepted as a destination value" rule, reusing the Destinations
 * Blueprint's own category-grouped browsing pattern.
 *
 * Restricted to destinations that already have a placeholder image in
 * /public/placeholders — every other page in this build follows the same
 * constraint, so Create Trip doesn't invent destinations the rest of the
 * site can't render.
 */
export type Destination = {
  slug: string;
  name: string;
  imgSrc: string;
  categories: ("mountains" | "beaches" | "heritage" | "adventure")[];
  popular?: boolean;
};

export const destinations: Destination[] = [
  { slug: "manali", name: "Manali", imgSrc: "/placeholders/manali.svg", categories: ["mountains"], popular: true },
  { slug: "kasol", name: "Kasol", imgSrc: "/placeholders/kasol.svg", categories: ["mountains"], popular: true },
  { slug: "spiti", name: "Spiti Valley", imgSrc: "/placeholders/spiti.svg", categories: ["mountains", "adventure"], popular: true },
  { slug: "leh-ladakh", name: "Leh-Ladakh", imgSrc: "/placeholders/leh-ladakh.svg", categories: ["mountains", "adventure"], popular: true },
  { slug: "mussoorie", name: "Mussoorie", imgSrc: "/placeholders/mussoorie.svg", categories: ["mountains"] },
  { slug: "goa", name: "Goa", imgSrc: "/placeholders/goa.svg", categories: ["beaches"], popular: true },
  { slug: "rishikesh", name: "Rishikesh", imgSrc: "/placeholders/rishikesh.svg", categories: ["adventure", "heritage"] },
  { slug: "jaipur", name: "Jaipur", imgSrc: "/placeholders/jaipur.svg", categories: ["heritage"] },
  { slug: "bir", name: "Bir", imgSrc: "/placeholders/bir.svg", categories: ["adventure", "mountains"] },
];

export const destinationCategories: { key: Destination["categories"][number]; label: string; emoji: string }[] = [
  { key: "mountains", label: "MOUNTAINS", emoji: "🏔️" },
  { key: "beaches", label: "BEACHES", emoji: "🏖️" },
  { key: "heritage", label: "HERITAGE", emoji: "🏛️" },
  { key: "adventure", label: "ADVENTURE", emoji: "🧗" },
];

export function searchDestinations(query: string): Destination[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return destinations.filter((d) => d.name.toLowerCase().includes(q));
}

export function getDestination(slug: string): Destination | undefined {
  return destinations.find((d) => d.slug === slug);
}
