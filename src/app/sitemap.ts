import type { MetadataRoute } from "next";

const appUrl = "https://brickvalue.live";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-06-22");

  return [
    {
      url: appUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${appUrl}/scan`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${appUrl}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
