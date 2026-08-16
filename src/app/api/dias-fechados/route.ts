import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { combineDateAndTime, dateOnlyToDate } from "@/lib/horarios";
import { diaFechadoSchema } from "@/lib/validations";

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const dias = await prisma.diaFechado.findMany({
    orderBy: { data: "desc" },
  });
  return NextResponse.json(dias);
}

export async function POST(request: Request) {
  if (!(await requireStaff())) {
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
  const afetadas = await prisma.agendamento.count({
    where: {
      dataHora: { gte: combineDateAndTime(parsed.data.data, "00:00"), lte: combineDateAndTime(parsed.data.data, "23:59") },
      status: "agendado",
      arquivadoEm: null,
    },
  });
  return NextResponse.json({ dia, afetadas }, { status: 201 });
}
