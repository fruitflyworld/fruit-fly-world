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
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}
