import { cookies } from "next/headers";
import { query } from "./db";
import { tokenHash } from "../canonical";

export const SESSION_COOKIE = "ffw_session";

export type Session = { address: string; expiresAt: string };

export async function currentSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await query<{ address: string; expires_at: Date }>(
    `SELECT address, expires_at FROM wallet_sessions
     WHERE token_hash = $1 AND expires_at > now()`,
    [tokenHash(token)]
  );
  const row = result.rows[0];
  return row ? { address: row.address, expiresAt: row.expires_at.toISOString() } : null;
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  };
}
