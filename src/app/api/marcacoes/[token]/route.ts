import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { moverAgendamento } from "@/lib/agendamentos";
import { novaHoraSchema } from "@/lib/validations";
import { hashToken } from "@/lib/tokens";
import { DisponibilidadeError } from "@/lib/disponibilidade";
import { apiError } from "@/lib/api";

async function obter(token: string) {
  return prisma.agendamento.findUnique({
    where: { tokenGestaoHash: hashToken(token) },
    include: { cliente: true, servico: true, profissional: true },
  });
}

export async function GET(_request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const agendamento = await obter(token);
  if (!agendamento || !agendamento.tokenGestaoExpiraEm || agendamento.tokenGestaoExpiraEm < new Date()) {
    return apiError("INVALID_TOKEN", "Link inválido ou expirado", 404);
  }
  return NextResponse.json(agendamento);
}

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const agendamento = await obter(token);
  if (!agendamento || !agendamento.tokenGestaoExpiraEm || agendamento.tokenGestaoExpiraEm < new Date()) {
    return apiError("INVALID_TOKEN", "Link inválido ou expirado", 404);
  }
  if (agendamento.status !== "agendado" || agendamento.dataHora <= new Date()) {
    return apiError("INVALID_STATE", "Esta marcação já não pode ser alterada", 409);
  }
  const body = await request.json().catch(() => null);
  if (body?.acao === "cancelar") {
    await prisma.$transaction([
      prisma.agendamento.update({ where: { id: agendamento.id }, data: { status: "cancelado" } }),
      prisma.propostaReagendamento.updateMany({
        where: { agendamentoId: agendamento.id, status: "pendente" },
        data: { status: "expirada", respondidaEm: new Date() },
      }),
    ]);
    return NextResponse.json({ ok: true, resultado: "cancelado" });
  }
  const parsed = novaHoraSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Escolhe uma data e hora válidas", 422);
  try {
    const updated = await moverAgendamento({ id: agendamento.id, data: parsed.data.data, hora: parsed.data.hora });
    return NextResponse.json({ ok: true, resultado: "reagendado", agendamento: updated });
  } catch (error) {
    if (error instanceof DisponibilidadeError) return apiError(error.code, error.message, 409);
    console.error("Erro na gestão pública", error);
    return apiError("INTERNAL_ERROR", "Não foi possível atualizar", 500);
  }
}
