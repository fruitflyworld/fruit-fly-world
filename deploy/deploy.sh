#!/usr/bin/env bash
# deploy/deploy.sh — install this source tree on the server as a new release.
#
# Run it on the server, from inside the unpacked package:
#     sudo bash deploy/deploy.sh
#
# What it does, in order:
#   1. checks Node 20+, npm, curl
#   2. copies the source to /srv/fruit-fly-world/releases/<UTC timestamp>
#      (an old install sitting directly in /srv/fruit-fly-world/current is kept
#      as releases/legacy-<timestamp>, so you can roll back to it)
#   3. npm ci, npm run build, npm test — any failure stops here, live site untouched
#   4. points /srv/fruit-fly-world/current at the new release and restarts the service
#      (installs the systemd unit from deploy/ if it isn't installed yet)
#   5. health check: the homepage answers, and the trading-fly replay of
#      season 0 tick 2000 equals the pinned chain 003ad503
#   6. if the health check fails, switches back to the previous release automatically
#
# It never reads or writes /etc/fruit-fly-world.env, nginx, certificates or contracts.
# Overridable: ROOT, PORT, SERVICE, RUN_USER, KEEP (releases to keep, default 5).
set -euo pipefail

ROOT="${ROOT:-/srv/fruit-fly-world}"
PORT="${PORT:-3210}"
SERVICE="${SERVICE:-fruit-fly-world}"
RUN_USER="${RUN_USER:-fruitfly}"
KEEP="${KEEP:-5}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(date -u +%Y%m%d%H%M%S)"
REL="$ROOT/releases/$TS"
GOLDEN_URL="http://127.0.0.1:$PORT/api/fly/dusty?season=0&tick=2000"
GOLDEN_CHAIN='"chain":"003ad503"'

say() { printf '\n\033[1;32m→ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run with sudo: sudo bash deploy/deploy.sh"
for c in node npm curl tar systemctl; do command -v "$c" >/dev/null || die "Missing command: $c"; done
node -e 'process.exit(+process.versions.node.split(".")[0] >= 20 ? 0 : 1)' || die "Node 20 or newer is required (found $(node -v))"
[ -f "$SRC/package.json" ] && [ -d "$SRC/app/lib/market" ] || die "Run this from inside the unpacked fruit-fly-world package"
[ -f /etc/fruit-fly-world.env ] || echo "NOTE: /etc/fruit-fly-world.env not found. The homepage, fly pages and replay work without it; Passport mint, login and the race need it (see .env.example)."

id "$RUN_USER" >/dev/null 2>&1 || { say "Creating system user $RUN_USER"; useradd --system --home-dir "$ROOT" --shell /usr/sbin/nologin "$RUN_USER"; }
mkdir -p "$ROOT/releases"

# An install that lives directly in current/ (not a symlink) becomes a release we can return to.
if [ -d "$ROOT/current" ] && [ ! -L "$ROOT/current" ]; then
  say "Keeping the existing install as releases/legacy-$TS"
  mv "$ROOT/current" "$ROOT/releases/legacy-$TS"
  ln -sfn "$ROOT/releases/legacy-$TS" "$ROOT/current"
fi
PREV="$(readlink -f "$ROOT/current" 2>/dev/null || true)"

say "Copying source to $REL"
mkdir -p "$REL"
tar -C "$SRC" --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude=./media \
    --exclude=./.env --exclude='./.env.local' --exclude='./.env.production' -cf - . | tar -C "$REL" -xf -

say "Installing dependencies and building (takes a few minutes)"
( cd "$REL" && npm ci --no-audit --no-fund && npm run build && npm test ) || { rm -rf "$REL"; die "Build or tests failed. Nothing was switched; the live site is unchanged."; }
chown -R "$RUN_USER:$RUN_USER" "$REL"

if ! systemctl cat "$SERVICE" >/dev/null 2>&1; then
  say "Installing systemd unit $SERVICE"
  sed "s#/usr/local/bin/node#$(command -v node)#" "$REL/deploy/fruit-fly-world.service" > "/etc/systemd/system/$SERVICE.service"
  systemctl daemon-reload
  systemctl enable "$SERVICE" >/dev/null
fi

say "Switching current → releases/$TS and restarting $SERVICE"
ln -sfn "$REL" "$ROOT/current"
systemctl restart "$SERVICE"

healthy() {
  for _ in $(seq 1 45); do
    if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null && curl -fsS "$GOLDEN_URL" 2>/dev/null | grep -q "$GOLDEN_CHAIN"; then return 0; fi
    sleep 2
  done
  return 1
}

say "Health check (homepage + replay golden 003ad503)"
if healthy; then
  echo "OK — $(curl -fsS "$GOLDEN_URL" | head -c 160)…"
else
  echo "Health check failed. Last log lines:"; journalctl -u "$SERVICE" -n 40 --no-pager || true
  if [ -n "$PREV" ] && [ -d "$PREV" ] && [ "$PREV" != "$REL" ]; then
    say "Rolling back to $PREV"
    ln -sfn "$PREV" "$ROOT/current"
    systemctl restart "$SERVICE"
    healthy && echo "Rolled back; the previous version is live." || echo "The previous version did not come back either — check: journalctl -u $SERVICE"
  fi
  die "Deploy failed (the new release is kept at $REL for inspection)."
fi

# Keep the newest $KEEP releases (never the one that is live).
LIVE="$(readlink -f "$ROOT/current")"
ls -1dt "$ROOT"/releases/*/ 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r d; do
  [ "$(readlink -f "$d")" = "$LIVE" ] || rm -rf "$d"
done

# Edge cache: nothing sits in front of this box today (fruitfly.world resolves
# straight to the server), so this is a no-op unless a CDN is configured. If you
# ever put Cloudflare in front, export CLOUDFLARE_API_TOKEN and
# CLOUDFLARE_ZONE_ID before running this script and every deploy purges it —
# otherwise the first visitor after a deploy keeps seeing the previous build.
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ZONE_ID:-}" ]; then
  say "Purging the edge cache (Cloudflare)"
  if curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}' >/dev/null; then
    echo "Edge cache purged."
  else
    echo "WARNING: the purge call failed — check the token and the zone id."
  fi
else
  echo "NOTE: no CDN credentials set (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID). Pages are served with max-age=0, must-revalidate, so nothing can hold a stale copy."
fi

say "Done. Live: $LIVE"
echo "Roll back any time:  sudo ln -sfn $ROOT/releases/<older> $ROOT/current && sudo systemctl restart $SERVICE"
grep -q "fruitfly.world" /etc/nginx/sites-enabled/* /etc/nginx/conf.d/* 2>/dev/null \
  || echo "NOTE: no nginx site for fruitfly.world found. Copy deploy/nginx.conf into /etc/nginx/sites-enabled/, reload nginx, then add HTTPS (e.g. certbot --nginx)."
