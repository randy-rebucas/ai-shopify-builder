import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
