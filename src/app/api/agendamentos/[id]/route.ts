import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { combineDateAndTime } from "@/lib/horarios";
import { slotLivre } from "@/lib/disponibilidade";
import { novaHoraSchema, statusSchema } from "@/lib/validations";

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);

  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: { servico: true },
  });
  if (!agendamento) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  if (body && body.status) {
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }
    const updated = await prisma.agendamento.update({
      where: { id },
      data: {
        status: parsed.data.status,
        propostaStatus: parsed.data.status === "cancelado" ? null : undefined,
      },
    });
    return NextResponse.json(updated);
  }

  if (body && body.data && body.hora) {
    const parsed = novaHoraSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Data/hora inválidas" }, { status: 400 });
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
    const updated = await prisma.agendamento.update({
      where: { id },
      data: {
        dataHora: combineDateAndTime(parsed.data.data, parsed.data.hora),
        novaDataHoraProposta: null,
        tokenProposta: null,
        propostaStatus: null,
        propostaExpiraEm: null,
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  await prisma.agendamento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
