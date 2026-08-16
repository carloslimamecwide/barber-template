import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const criarSchema = z.object({
  email: z.email(), password: z.string().min(8), role: z.enum(["admin", "rececao", "profissional"]),
  profissionalId: z.string().nullable().optional(),
});

export async function GET() {
  if (!(await requireAdmin())) return apiError("FORBIDDEN", "Acesso reservado a administradores", 403);
  return NextResponse.json(await prisma.user.findMany({ select: { id: true, email: true, role: true, ativo: true, profissionalId: true, createdAt: true }, orderBy: { email: "asc" } }));
}

export async function POST(request: Request) {
  const auth = await requireAdmin(); if (!auth) return apiError("FORBIDDEN", "Acesso reservado a administradores", 403);
  const parsed = criarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Utilizador inválido", 422, parsed.error.issues);
  const user = await prisma.user.create({ data: { email: parsed.data.email.toLowerCase(), passwordHash: await bcrypt.hash(parsed.data.password, 12), role: parsed.data.role, profissionalId: parsed.data.role === "profissional" ? parsed.data.profissionalId : null } });
  await auditar({ userId: auth.userId, acao: "criar", entidade: "User", entidadeId: user.id, request });
  return NextResponse.json({ id: user.id, email: user.email, role: user.role, ativo: user.ativo, profissionalId: user.profissionalId }, { status: 201 });
}
