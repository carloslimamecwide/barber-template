import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slotLivre } from "@/lib/disponibilidade";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: token } = await ctx.params;
  const body = await request.json().catch(() => null);
  const decisao = body?.decisao;

  if (decisao !== "confirmar" && decisao !== "recusar") {
    return NextResponse.json({ error: "Decisão inválida" }, { status: 400 });
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: { tokenProposta: token },
    include: { servico: true },
  });
  if (!agendamento || !agendamento.novaDataHoraProposta) {
    return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
  }
  if (agendamento.propostaStatus === "confirmada") {
    return NextResponse.json({ error: "Esta proposta já foi confirmada" }, { status: 409 });
  }
  if (agendamento.propostaStatus === "recusada") {
    return NextResponse.json({ error: "Esta proposta já foi recusada" }, { status: 409 });
  }
  if (agendamento.propostaExpiraEm && agendamento.propostaExpiraEm < new Date()) {
    return NextResponse.json({ error: "Esta proposta expirou" }, { status: 410 });
  }

  if (decisao === "recusar") {
    const updated = await prisma.agendamento.update({
      where: { id: agendamento.id },
      data: {
        novaDataHoraProposta: null,
        tokenProposta: null,
        propostaStatus: "recusada",
        propostaExpiraEm: null,
      },
    });
    return NextResponse.json({ ok: true, resultado: "recusado", agendamento: updated });
  }

  const data = agendamento.novaDataHoraProposta;
  const dia = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
  const hora = `${String(data.getHours()).padStart(2, "0")}:${String(data.getMinutes()).padStart(2, "0")}`;

  const livre = await slotLivre(dia, hora, agendamento.servico.duracaoMin, agendamento.id, agendamento.profissionalId ?? undefined);
  if (!livre) {
    return NextResponse.json(
      { error: "Esta hora já foi ocupada entretanto" },
      { status: 409 },
    );
  }

  const updated = await prisma.agendamento.update({
    where: { id: agendamento.id },
    data: {
      dataHora: agendamento.novaDataHoraProposta,
      novaDataHoraProposta: null,
      tokenProposta: null,
      propostaStatus: "confirmada",
      propostaExpiraEm: null,
    },
  });

  return NextResponse.json({ ok: true, resultado: "confirmado", agendamento: updated });
}
