export async function loader() {
const baseUrl = "https://xn--cckl9nsb.com";

  const routes = [
    { url: "/", priority: 1.0, changefreq: "weekly", lastmod: "2025-11-15" },
    { url: "/ja", priority: 0.8, changefreq: "weekly", lastmod: "2026-10-14" },
    { url: "/en", priority: 0.8, changefreq: "weekly", lastmod: "2026-10-14" },
    { url: "/gallery", priority: 0.9, changefreq: "monthly", lastmod: "2025-11-10" },
    { url: "/chat", priority: 0.8, changefreq: "weekly", lastmod: "2025-11-15" },
    { url: "/cv", priority: 0.9, changefreq: "monthly", lastmod: "2025-11-01" },
    { url: "/game", priority: 0.7, changefreq: "monthly", lastmod: "2025-11-15" },
    { url: "/game/playstation", priority: 0.6, changefreq: "monthly", lastmod: "2025-11-15" },
    { url: "/game/switch", priority: 0.6, changefreq: "monthly", lastmod: "2025-11-15" },
    { url: "/game/pc", priority: 0.6, changefreq: "monthly", lastmod: "2025-11-15" },
    { url: "/anime", priority: 0.7, changefreq: "monthly", lastmod: "2025-10-15" },
    { url: "/music", priority: 0.6, changefreq: "monthly", lastmod: "2025-10-01" },
    { url: "/updates", priority: 0.5, changefreq: "weekly", lastmod: "2025-11-15" },
    { url: "/messages", priority: 0.5, changefreq: "weekly", lastmod: "2025-11-15" },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${baseUrl}${route.url}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
    ${route.lastmod ? `<lastmod>${route.lastmod}</lastmod>` : ""}
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400", // 24小时缓存
    },
  });
}
