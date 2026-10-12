import type { MetadataRoute } from "next";

const BASE = "https://fruitfly.world";

/* The pages worth indexing. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/fly/dusty", priority: 0.95 },
    { path: "/dish", priority: 0.85 },
    { path: "/pitch", priority: 0.8 },
    { path: "/economics", priority: 0.8 },
    { path: "/participate", priority: 0.7 }
  ];

  return routes.map(({ path, priority }) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority
  }));
}
