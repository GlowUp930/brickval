import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BrickVal - LEGO Set Value Scanner",
    short_name: "BrickVal",
    description:
      "Scan LEGO sets and minifigures to estimate current USD market value using BrickLink, eBay, and set data.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0c0e0c",
    theme_color: "#f5ca41",
    categories: ["utilities", "shopping", "productivity"],
    icons: [
      {
        src: "/icon.png",
        sizes: "400x400",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "400x400",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "400x400",
        type: "image/png",
      },
    ],
  };
}
