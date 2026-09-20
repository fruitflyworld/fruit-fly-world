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
  }
};

module.exports = nextConfig;
