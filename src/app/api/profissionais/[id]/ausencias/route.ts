import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ausenciaSchema } from "@/lib/validations";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return apiError("FORBIDDEN", "Sem permissão", 403);
  const { id } = await ctx.params;
  return NextResponse.json(await prisma.ausenciaProfissional.findMany({ where: { profissionalId: id, fim: { gte: new Date() } }, orderBy: { inicio: "asc" } }));
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id } = await ctx.params;
  const parsed = ausenciaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Ausência inválida", 422, parsed.error.issues);
  const ausencia = await prisma.ausenciaProfissional.create({
    data: { profissionalId: id, inicio: new Date(parsed.data.inicio), fim: new Date(parsed.data.fim), motivo: parsed.data.motivo },
  });
  await auditar({ userId: auth.userId, acao: "criar_ausencia", entidade: "Profissional", entidadeId: id, dados: { ausenciaId: ausencia.id }, request });
  return NextResponse.json(ausencia, { status: 201 });
}
