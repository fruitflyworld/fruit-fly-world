import "server-only";

function normalizedOrigin(value: string) {
  try { return new URL(value).origin; } catch { return ""; }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (process.env.COOKIE_SECURE === "true" ? "https" : "http");
  if (!origin || !host) throw new Error("Invalid request origin");
  const expected = `${proto}://${host}`;
  const allowed = (process.env.ALLOWED_ORIGINS || expected).split(",").map((item) => normalizedOrigin(item.trim())).filter(Boolean);
  if (!allowed.includes(normalizedOrigin(origin))) throw new Error("Invalid request origin");
}

export function clientIp(request: Request) {
  // nginx sets X-Real-IP to $remote_addr unconditionally, so it is the one
  // header a client cannot influence. X-Forwarded-For is
  // $proxy_add_x_forwarded_for: the real client address is appended LAST, and
  // anything before it is whatever the client chose to send — an attacker
  // forging that header must never get a fresh rate-limit identity per request.
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").pop()?.trim();
  return last || "unknown";
}
