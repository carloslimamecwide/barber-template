import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { horarioSchema } from "@/lib/validations";
import { gerarSlots, toDateOnlyString } from "@/lib/horarios";
import { obterHorarioDoDia } from "@/lib/disponibilidade";

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

  const parsed = body.map((item) => horarioSchema.safeParse(item));
  if (parsed.some((item) => !item.success)) {
    return NextResponse.json({ error: "Existem horários inválidos" }, { status: 422 });
  }
  const valores = parsed.map((item) => item.data!);
  if (new Set(valores.map((item) => item.diaDaSemana)).size !== 7 || valores.length !== 7) {
    return NextResponse.json({ error: "É obrigatório enviar os sete dias sem duplicados" }, { status: 422 });
  }
  const resultados = await prisma.$transaction(valores.map(({ diaDaSemana, aberto, abertura, fecho, pausaInicio, pausaFim }) =>
    prisma.horarioFuncionamento.upsert({
      where: { diaDaSemana },
      update: { aberto, abertura: aberto ? abertura : null, fecho: aberto ? fecho : null, pausaInicio: aberto ? pausaInicio ?? null : null, pausaFim: aberto ? pausaFim ?? null : null },
      create: { diaDaSemana, aberto, abertura: aberto ? abertura : null, fecho: aberto ? fecho : null, pausaInicio: aberto ? pausaInicio ?? null : null, pausaFim: aberto ? pausaFim ?? null : null },
    }),
  ));
  const futuras = await prisma.agendamento.findMany({
    where: { status: "agendado", dataHora: { gt: new Date() }, arquivadoEm: null },
    select: { dataHora: true, duracaoAgendadaMin: true },
  });
  let afetadas = 0;
  for (const agendamento of futuras) {
    const data = toDateOnlyString(agendamento.dataHora);
    const hora = new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(agendamento.dataHora);
    const horario = await obterHorarioDoDia(data);
    if (!gerarSlots({ data, duracaoMin: agendamento.duracaoAgendadaMin, horario, ocupacoes: [] }).includes(hora)) afetadas++;
  }
  return NextResponse.json({ horarios: resultados, afetadas });
}
