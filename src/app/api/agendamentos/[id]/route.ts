import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moverAgendamento } from "@/lib/agendamentos";
import { DisponibilidadeError } from "@/lib/disponibilidade";
import { novaHoraSchema, statusSchema } from "@/lib/validations";
import { apiError } from "@/lib/api";

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);

  if (body?.status) {
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Status inválido", 422);
    const exists = await prisma.agendamento.findUnique({ where: { id } });
    if (!exists) return apiError("NOT_FOUND", "Agendamento não encontrado", 404);
    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.status !== "agendado") {
        await tx.propostaReagendamento.updateMany({
          where: { agendamentoId: id, status: "pendente" },
          data: { status: "expirada", respondidaEm: new Date() },
        });
      }
      return tx.agendamento.update({ where: { id }, data: { status: parsed.data.status } });
    });
    return NextResponse.json(updated);
  }

  const parsed = novaHoraSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Data/hora inválidas", 422, parsed.error.issues);
  try {
    const updated = await moverAgendamento({
      id,
      data: parsed.data.data,
      hora: parsed.data.hora,
      permitirExcecao: parsed.data.override,
      motivoExcecao: parsed.data.overrideReason,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof DisponibilidadeError) {
      return apiError(parsed.data.override ? error.code : "OVERRIDE_REQUIRED", error.message, 409);
    }
    if (error instanceof Error && error.message === "AGENDAMENTO_INEXISTENTE") {
      return apiError("NOT_FOUND", "Agendamento não encontrado", 404);
    }
    console.error("Erro ao mover agendamento", error);
    return apiError("INTERNAL_ERROR", "Não foi possível atualizar", 500);
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id } = await ctx.params;
  const result = await prisma.agendamento.updateMany({
    where: { id, arquivadoEm: null },
    data: { status: "cancelado", arquivadoEm: new Date() },
  });
  if (!result.count) return apiError("NOT_FOUND", "Agendamento não encontrado", 404);
  return NextResponse.json({ ok: true });
}
