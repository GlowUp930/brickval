import type { MetadataRoute } from "next";

const siteUrl = "https://brickvalue.live";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms", "/delete-account"],
        disallow: [
          "/account",
          "/api/",
          "/bulk",
          "/onboarding",
          "/scan",
          "/upgrade",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
