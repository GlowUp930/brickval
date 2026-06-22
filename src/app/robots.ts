import type { MetadataRoute } from "next";

const appUrl = "https://brickvalue.live";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/upgrade/"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
