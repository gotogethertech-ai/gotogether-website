/**
 * Canonical site URL, used for metadataBase, sitemap.ts, and robots.ts.
 * Reads NEXT_PUBLIC_SITE_URL when set (production deploy should set this
 * to the real domain); falls back to a placeholder so the app still
 * builds and runs correctly before a domain is chosen.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gotogether.in";
