import { NextResponse } from "next/server";
import { requireAuth, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moverAgendamento } from "@/lib/agendamentos";
import { DisponibilidadeError } from "@/lib/disponibilidade";
import { novaHoraSchema, statusSchema } from "@/lib/validations";
import { apiError } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);

  if (body?.status) {
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Status inválido", 422);
    const exists = await prisma.agendamento.findUnique({ where: { id } });
    if (!exists) return apiError("NOT_FOUND", "Agendamento não encontrado", 404);
    if (auth.role === "profissional" && exists.profissionalId !== auth.profissionalId) return apiError("FORBIDDEN", "Sem acesso a esta marcação", 403);
    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.status !== "agendado") {
        await tx.propostaReagendamento.updateMany({
          where: { agendamentoId: id, status: "pendente" },
          data: { status: "expirada", respondidaEm: new Date() },
        });
      }
      const result = await tx.agendamento.updateMany({ where: { id, ...(parsed.data.versao ? { versao: parsed.data.versao } : {}) }, data: { status: parsed.data.status, motivoStatus: parsed.data.motivoStatus ?? null, versao: { increment: 1 } } });
      if (!result.count) return null;
      return tx.agendamento.findUnique({ where: { id } });
    });
    if (!updated) return apiError("VERSION_CONFLICT", "A marcação foi alterada por outra pessoa. Atualiza a agenda.", 409);
    await auditar({ userId: auth.userId, acao: "alterar_status", entidade: "Agendamento", entidadeId: id, dados: { de: exists.status, para: parsed.data.status }, request });
    return NextResponse.json(updated);
  }

  const parsed = novaHoraSchema.safeParse(body);
  if (auth.role === "profissional") return apiError("FORBIDDEN", "Apenas a receção pode mover marcações", 403);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Data/hora inválidas", 422, parsed.error.issues);
  try {
    const updated = await moverAgendamento({
      id,
      data: parsed.data.data,
      hora: parsed.data.hora,
      permitirExcecao: parsed.data.override,
      motivoExcecao: parsed.data.overrideReason,
    });
    await auditar({ userId: auth.userId, acao: parsed.data.override ? "mover_excecao" : "mover", entidade: "Agendamento", entidadeId: id, dados: { data: parsed.data.data, hora: parsed.data.hora, motivo: parsed.data.overrideReason ?? null }, request });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof DisponibilidadeError) {
      return apiError(parsed.data.override ? error.code : "OVERRIDE_REQUIRED", error.message, 409);
    }
    if (error instanceof Error && error.message === "AGENDAMENTO_INEXISTENTE") {
      return apiError("NOT_FOUND", "Agendamento não encontrado", 404);
    }
    logger.error("booking.move_failed", error, { agendamentoId: id, userId: auth.userId });
    return apiError("INTERNAL_ERROR", "Não foi possível atualizar", 500);
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id } = await ctx.params;
  const result = await prisma.agendamento.updateMany({
    where: { id, arquivadoEm: null },
    data: { status: "cancelado", arquivadoEm: new Date() },
  });
  if (!result.count) return apiError("NOT_FOUND", "Agendamento não encontrado", 404);
  await auditar({ userId: auth.userId, acao: "arquivar", entidade: "Agendamento", entidadeId: id, request });
  return NextResponse.json({ ok: true });
}
