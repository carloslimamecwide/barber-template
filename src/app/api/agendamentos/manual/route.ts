import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { combineDateAndTime } from "@/lib/horarios";
import { slotLivre } from "@/lib/disponibilidade";
import { agendamentoManualSchema } from "@/lib/validations";
import { randomUUID } from "node:crypto";

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = agendamentoManualSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { clienteId, servicoId, profissionalId, data, hora, notas } = parsed.data;
  const servico = await prisma.servico.findUnique({ where: { id: servicoId } });
  if (!servico) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const profissionais = await prisma.profissional.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { nome: "asc" }] });
  const candidatos = profissionalId ? profissionais.filter((p) => p.id === profissionalId) : profissionais;
  if (profissionalId && candidatos.length === 0) {
    return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });
  }
  let profissional: (typeof candidatos)[number] | undefined = candidatos[0];
  let livre = false;
  if (candidatos.length > 0) {
    profissional = undefined;
    for (const candidato of candidatos) {
      if (await slotLivre(data, hora, servico.duracaoMin, undefined, candidato.id)) {
        profissional = candidato;
        livre = true;
        break;
      }
    }
  } else {
    livre = await slotLivre(data, hora, servico.duracaoMin);
  }
  if (!livre) {
    return NextResponse.json({ error: "Esta hora já está ocupada" }, { status: 409 });
  }

  const agendamento = await prisma.agendamento.create({
    data: {
      clienteId,
      servicoId,
      profissionalId: profissional?.id,
      dataHora: combineDateAndTime(data, hora),
      status: "agendado",
      precoCobrado: servico.precoCents,
      notas,
      tokenGestao: randomUUID(),
      tokenGestaoExpiraEm: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
    },
  });
  return NextResponse.json(agendamento, { status: 201 });
}
