import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Admins paste destination cover image URLs from wherever (Pixabay,
    // Unsplash, Pexels, Supabase storage, ...) via the /admin/destinations
    // form — next/image refuses any hostname not explicitly allowed here,
    // so this list needs to cover the common free-image sources rather
    // than just whichever one was tested first.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.pixabay.com" },
      { protocol: "https", hostname: "pixabay.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    // Phase 6 (Clicks) perf: Next's default deviceSizes/imageSizes spans a
    // much wider set of breakpoints (up to 3840px, and small icon sizes
    // down to 16px) than anything this app actually requests via `sizes`.
    // Every distinct requested width is a separate cache entry the image
    // optimizer has to generate from the original — narrowing this list to
    // the widths actually used across the app's `sizes` props (Clicks'
    // 150/300/600px grid tiles, the 720px detail cover, trip/destination
    // cards, and common full-viewport breakpoints) means fewer variants
    // generated per image without changing how anything renders.
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 150, 200, 256, 300, 384, 600, 720],
  },
};

export default nextConfig;
