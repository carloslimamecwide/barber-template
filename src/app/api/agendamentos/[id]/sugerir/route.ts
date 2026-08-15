import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { combineDateAndTime } from "@/lib/horarios";
import { slotLivre } from "@/lib/disponibilidade";
import { novaHoraSchema } from "@/lib/validations";
import { enviarEmailSugestao } from "@/lib/email";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = novaHoraSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data/hora inválidas" }, { status: 400 });
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: { servico: true, cliente: true },
  });
  if (!agendamento) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }
  if (!agendamento.cliente.email) {
    return NextResponse.json(
      { error: "O cliente não tem email para enviar a sugestão" },
      { status: 400 },
    );
  }

  const livre = await slotLivre(
    parsed.data.data,
    parsed.data.hora,
    agendamento.servico.duracaoMin,
    agendamento.id,
    agendamento.profissionalId ?? undefined,
  );
  if (!livre) {
    return NextResponse.json({ error: "Esta hora já está ocupada" }, { status: 409 });
  }

  const token = randomUUID();
  const novaDataHora = combineDateAndTime(parsed.data.data, parsed.data.hora);
  const expiraEm = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const updated = await prisma.agendamento.update({
    where: { id },
    data: {
      novaDataHoraProposta: novaDataHora,
      tokenProposta: token,
      propostaStatus: "pendente",
      propostaExpiraEm: expiraEm,
    },
  });

  await enviarEmailSugestao({
    email: agendamento.cliente.email,
    nome: agendamento.cliente.nome,
    servico: agendamento.servico.nome,
    horaAtual: agendamento.dataHora,
    novaHora: novaDataHora,
    token,
  }).catch((e) => {
    console.error("Falha ao enviar email de sugestão:", e);
  });

  return NextResponse.json(updated);
}
