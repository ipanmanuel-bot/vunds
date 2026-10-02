import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vunds",
    short_name: "Vunds",
    description: "Household finance dashboard",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf6f0",
    theme_color: "#faf6f0",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
