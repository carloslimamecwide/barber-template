import { NextResponse } from "next/server";
import { verifyBarberCredentials } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { loginSchema } from "@/lib/validations";
import { consumirLimite } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { apiError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limite = await consumirLimite({ chave: `login:${ip}`, limite: 10, janelaMs: 15 * 60_000 });
  if (!limite.permitido) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Demasiadas tentativas. Tenta novamente mais tarde." } },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter) } },
    );
  }
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Dados inválidos", 400, parsed.error.issues);
  }

  const user = await verifyBarberCredentials(
    parsed.data.email,
    parsed.data.password,
  );
  if (!user) {
    logger.warn("auth.login_failed", { ip, email: parsed.data.email.toLowerCase() });
    return NextResponse.json(
      { error: "Credenciais inválidas" },
      { status: 401 },
    );
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.role = user.role;
  await session.save();
  logger.info("auth.login_succeeded", { ip, userId: user.id });

  return NextResponse.json({ ok: true });
}
