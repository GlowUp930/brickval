import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BrickVal - LEGO Set Value Scanner",
    short_name: "BrickVal",
    description:
      "Scan LEGO sets and minifigures to see current USD market value, retirement status, and pricing evidence.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#15111b",
    theme_color: "#f5c835",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
