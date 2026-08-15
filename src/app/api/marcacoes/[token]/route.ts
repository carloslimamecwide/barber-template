import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { combineDateAndTime } from "@/lib/horarios";
import { obterHorarioDoDia, slotLivre } from "@/lib/disponibilidade";
import { novaHoraSchema } from "@/lib/validations";

async function obter(token: string) {
  return prisma.agendamento.findUnique({
    where: { tokenGestao: token },
    include: { cliente: true, servico: true, profissional: true },
  });
}

export async function GET(_request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const agendamento = await obter(token);
  if (!agendamento || (agendamento.tokenGestaoExpiraEm && agendamento.tokenGestaoExpiraEm < new Date())) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });
  }
  return NextResponse.json(agendamento);
}

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const agendamento = await obter(token);
  if (!agendamento || (agendamento.tokenGestaoExpiraEm && agendamento.tokenGestaoExpiraEm < new Date())) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });
  }
  if (agendamento.status !== "agendado" || agendamento.dataHora <= new Date()) {
    return NextResponse.json({ error: "Esta marcação já não pode ser alterada" }, { status: 409 });
  }
  const body = await request.json().catch(() => null) as { acao?: string; data?: string; hora?: string } | null;
  if (body?.acao === "cancelar") {
    const updated = await prisma.agendamento.update({ where: { id: agendamento.id }, data: { status: "cancelado" } });
    return NextResponse.json({ ok: true, agendamento: updated });
  }
  const parsed = novaHoraSchema.safeParse({ data: body?.data, hora: body?.hora });
  if (!parsed.success) return NextResponse.json({ error: "Escolhe uma data e hora válidas" }, { status: 400 });
  const horario = await obterHorarioDoDia(parsed.data.data);
  if (!horario.aberto) return NextResponse.json({ error: "A barbearia está fechada nesse dia" }, { status: 400 });
  const livre = await slotLivre(parsed.data.data, parsed.data.hora, agendamento.servico.duracaoMin, agendamento.id, agendamento.profissionalId ?? undefined);
  if (!livre) return NextResponse.json({ error: "Esse horário já não está disponível" }, { status: 409 });
  const updated = await prisma.agendamento.update({
    where: { id: agendamento.id },
    data: { dataHora: combineDateAndTime(parsed.data.data, parsed.data.hora), propostaStatus: null, novaDataHoraProposta: null },
  });
  return NextResponse.json({ ok: true, agendamento: updated });
}
