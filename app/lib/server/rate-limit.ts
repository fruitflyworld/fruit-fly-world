import "server-only";
import { createHmac } from "node:crypto";
import { query } from "./db";

function subjectHash(subject: string) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error("RATE_LIMIT_SECRET is not configured securely");
  return createHmac("sha256", secret).update(subject).digest("hex");
}

export async function enforceRateLimit(action: string, subject: string, limit: number, windowSeconds: number) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds;
  const result = await query<{ request_count: number }>(
    `INSERT INTO api_rate_limits(action,subject_hash,window_start,request_count)
     VALUES($1,$2,to_timestamp($3),1)
     ON CONFLICT(action,subject_hash,window_start)
     DO UPDATE SET request_count=api_rate_limits.request_count+1
     RETURNING request_count`,
    [action, subjectHash(subject), bucket]
  );
  if (result.rows[0].request_count > limit) throw new Error("Too many requests. Try again later.");
}
