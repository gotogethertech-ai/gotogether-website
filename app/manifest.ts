import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GoTogether",
    short_name: "GoTogether",
    description:
      "Find people already planning your next trip — search a destination, see who's going, and join with real, verified travellers.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/brand/gotogether-logo-128.png",
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: "/brand/gotogether-logo-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
