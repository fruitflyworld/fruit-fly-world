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
        { source: "/play", destination: "/play/index.html" },
        // The Jev-week design brief: a self-contained static page, same pattern as /play.
        { source: "/pitch/fruitfly", destination: "/pitch/fruitfly/index.html" }
      ]
    };
  },
  /* Baseline browser hardening. No CSP here on purpose: /play and /essay are
     self-contained pages with their own inline module trees, and a wrong CSP
     breaks the game silently — the headers below are the ones that carry no
     such risk. The site is always served over https by nginx. */
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }
      ]
    }];
  }
};

module.exports = nextConfig;
