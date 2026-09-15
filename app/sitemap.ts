import type { MetadataRoute } from "next";

const BASE = "https://fruitfly.world";

/* The pages worth indexing. The arena itself is one page that never stops moving,
   so it is not listed per round — there is nothing at a round URL to crawl. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/pitch", priority: 0.8 },
    { path: "/economics", priority: 0.8 },
    { path: "/participate", priority: 0.7 },
    { path: "/skill/ffw-arena", priority: 0.7 }
  ];

  return routes.map(({ path, priority }) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority
  }));
}
