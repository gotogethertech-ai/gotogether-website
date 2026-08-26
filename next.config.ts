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
  },
};

export default nextConfig;
