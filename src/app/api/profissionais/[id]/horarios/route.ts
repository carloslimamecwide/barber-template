import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { horarioProfissionalSchema } from "@/lib/validations";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return apiError("FORBIDDEN", "Sem permissão", 403);
  const { id } = await ctx.params;
  return NextResponse.json(await prisma.horarioProfissional.findMany({ where: { profissionalId: id }, orderBy: { diaDaSemana: "asc" } }));
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id } = await ctx.params;
  const parsed = z.array(horarioProfissionalSchema).max(7).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Horários inválidos", 422, parsed.error.issues);
  const existe = await prisma.profissional.count({ where: { id } });
  if (!existe) return apiError("NOT_FOUND", "Profissional não encontrado", 404);
  await prisma.$transaction([
    prisma.horarioProfissional.deleteMany({ where: { profissionalId: id } }),
    prisma.horarioProfissional.createMany({ data: parsed.data.map((item) => ({ ...item, profissionalId: id })) }),
  ]);
  await auditar({ userId: auth.userId, acao: "atualizar_horarios", entidade: "Profissional", entidadeId: id, request });
  return NextResponse.json(await prisma.horarioProfissional.findMany({ where: { profissionalId: id }, orderBy: { diaDaSemana: "asc" } }));
}
