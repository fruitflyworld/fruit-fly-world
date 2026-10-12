/** @type {import('next').NextConfig} */
const nextConfig = {
  /* The game is a self-contained static page under public/play/ — its own CSS,
     its own Phaser bundle, its own ES module tree. Next serves the files inside
     untouched, but does not resolve a bare directory to its index.html, so the
     clean entry URL /play is mapped explicitly. The game's own asset URLs are
     absolute (/play/...) so they resolve the same at /play and /play/index.html. */
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/play", destination: "/play/index.html" }
      ]
    };
  },
  /* The Jev-week brief and the old Fly Lab prototype were Chinese-language
     documents. They now live under docs/ (not served) and these URLs land on
     their English counterparts. */
  async redirects() {
    return [
      { source: "/pitch/fruitfly", destination: "/pitch", permanent: false },
      { source: "/pitch/fruitfly/brief.html", destination: "/pitch", permanent: false },
      { source: "/fly-lab.html", destination: "/lab", permanent: false },
      /* The player-facing game is parked while the trading fly is the front
         door. The game's own files are still in the tree, so un-redirecting
         these two lines brings both pages back. */
      { source: "/play", destination: "/", permanent: false },
      { source: "/play/:path*", destination: "/", permanent: false },
      { source: "/game", destination: "/", permanent: false }
    ];
  },
  /* Baseline browser hardening. No CSP here on purpose: /play and /essay are
     self-contained pages with their own inline module trees, and a wrong CSP
     breaks the game silently — the headers below are the ones that carry no
     such risk. The site is always served over https by nginx. */
  async headers() {
    return [
      {
        /* Pages must revalidate. Next's default for a prerendered page is
           `s-maxage=31536000, stale-while-revalidate`, which lets any shared
           cache — a CDN, an office proxy, an ISP — keep serving yesterday's
           build for a year. A deploy swaps the whole build, so a cached page is
           not a performance win, it is a stale promise. Hashed build assets
           still sit under /_next/static and keep their immutable caching. */
        source: "/:path((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image).*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" }
        ]
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
