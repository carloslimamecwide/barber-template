import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateOnlyToDate } from "@/lib/horarios";
import { diaFechadoSchema } from "@/lib/validations";

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const dias = await prisma.diaFechado.findMany({
    orderBy: { data: "desc" },
  });
  return NextResponse.json(dias);
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = diaFechadoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const dia = await prisma.diaFechado.upsert({
    where: { data: dateOnlyToDate(parsed.data.data) },
    update: { motivo: parsed.data.motivo },
    create: { data: dateOnlyToDate(parsed.data.data), motivo: parsed.data.motivo },
  });
  return NextResponse.json(dia, { status: 201 });
}
