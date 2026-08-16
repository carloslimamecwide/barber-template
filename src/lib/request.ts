import { createHash } from "node:crypto";

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "desconhecido";
}

export function requestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function idempotencyKey(request: Request): string | null {
  const key = request.headers.get("idempotency-key")?.trim();
  return key && /^[a-zA-Z0-9:_-]{8,120}$/.test(key) ? key : null;
}
