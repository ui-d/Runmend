import type { MetadataRoute } from "next";
import { getAllProfiles } from "@/lib/profiles";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://runmend.com";
  const profiles = getAllProfiles();

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/vs-claude-cowork`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...profiles.map((profile) => ({
      url: `${baseUrl}/dashboard/${profile.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
