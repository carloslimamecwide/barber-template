import { NextResponse } from "next/server";
import { verifyBarberCredentials } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos" },
      { status: 400 },
    );
  }

  const user = await verifyBarberCredentials(
    parsed.data.email,
    parsed.data.password,
  );
  if (!user) {
    return NextResponse.json(
      { error: "Credenciais inválidas" },
      { status: 401 },
    );
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();

  return NextResponse.json({ ok: true });
}
