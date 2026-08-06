import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/account", "/projects/", "/team", "/marketplace"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
