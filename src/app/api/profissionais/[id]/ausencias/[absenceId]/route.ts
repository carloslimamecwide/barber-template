import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string; absenceId: string }> }) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id, absenceId } = await ctx.params;
  const result = await prisma.ausenciaProfissional.deleteMany({ where: { id: absenceId, profissionalId: id } });
  if (!result.count) return apiError("NOT_FOUND", "Ausência não encontrada", 404);
  await auditar({ userId: auth.userId, acao: "apagar_ausencia", entidade: "Profissional", entidadeId: id, dados: { ausenciaId: absenceId }, request });
  return NextResponse.json({ ok: true });
}
