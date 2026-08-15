import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { horarioSchema } from "@/lib/validations";

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const horarios = await prisma.horarioFuncionamento.findMany({
    orderBy: { diaDaSemana: "asc" },
  });
  return NextResponse.json(horarios);
}

export async function PUT(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Esperado um array de horários" }, { status: 400 });
  }

  const resultados = [];
  for (const item of body) {
    const parsed = horarioSchema.safeParse(item);
    if (!parsed.success) continue;
    const { diaDaSemana, aberto, abertura, fecho, pausaInicio, pausaFim } = parsed.data;
    const atual = await prisma.horarioFuncionamento.findUnique({
      where: { diaDaSemana },
    });
    if (atual) {
      resultados.push(
        await prisma.horarioFuncionamento.update({
          where: { diaDaSemana },
          data: { aberto, abertura: aberto ? abertura : null, fecho: aberto ? fecho : null, pausaInicio: aberto ? pausaInicio ?? null : null, pausaFim: aberto ? pausaFim ?? null : null },
        }),
      );
    } else {
      resultados.push(
        await prisma.horarioFuncionamento.create({
          data: { diaDaSemana, aberto, abertura: aberto ? abertura : null, fecho: aberto ? fecho : null, pausaInicio: aberto ? pausaInicio ?? null : null, pausaFim: aberto ? pausaFim ?? null : null },
        }),
      );
    }
  }
  return NextResponse.json(resultados);
}
