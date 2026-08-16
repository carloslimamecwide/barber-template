import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ role: z.enum(["admin", "rececao", "profissional"]).optional(), ativo: z.boolean().optional(), password: z.string().min(8).optional(), profissionalId: z.string().nullable().optional() });
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if (!auth) return apiError("FORBIDDEN", "Acesso reservado a administradores", 403);
  const { id } = await ctx.params; const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Dados inválidos", 422, parsed.error.issues);
  if (id === auth.userId && parsed.data.ativo === false) return apiError("SELF_DEACTIVATION", "Não podes desativar a tua própria conta", 409);
  const user = await prisma.user.update({ where: { id }, data: { ...(parsed.data.role ? { role: parsed.data.role } : {}), ...(parsed.data.ativo === undefined ? {} : { ativo: parsed.data.ativo }), ...(parsed.data.password ? { passwordHash: await bcrypt.hash(parsed.data.password, 12) } : {}), ...(parsed.data.profissionalId !== undefined ? { profissionalId: parsed.data.role === "profissional" ? parsed.data.profissionalId : null } : {}) } });
  await auditar({ userId: auth.userId, acao: "atualizar", entidade: "User", entidadeId: id, request });
  return NextResponse.json({ id: user.id, email: user.email, role: user.role, ativo: user.ativo, profissionalId: user.profissionalId });
}
