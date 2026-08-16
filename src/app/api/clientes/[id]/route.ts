import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clienteSchema } from "@/lib/validations";
import { apiError } from "@/lib/api";
import { auditar } from "@/lib/audit";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return apiError("FORBIDDEN", "Sem permissão", 403);
  const { id } = await ctx.params;
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { agendamentos: { include: { servico: true, profissional: true }, orderBy: { dataHora: "desc" }, take: 100 } },
  });
  if (!cliente) return apiError("NOT_FOUND", "Cliente não encontrado", 404);
  return NextResponse.json(cliente);
}

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = clienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const cliente = await prisma.cliente.update({
    where: { id },
    data: {
      ...parsed.data,
      email: parsed.data.email?.trim().toLowerCase() || null,
      emailNormalizado: parsed.data.email?.trim().toLowerCase() || null,
      ativo: true,
    },
  });
  await auditar({ userId: auth.userId, acao: "atualizar", entidade: "Cliente", entidadeId: id, request });
  return NextResponse.json(cliente);
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id } = await ctx.params;
  await prisma.cliente.update({ where: { id }, data: { ativo: false } });
  await auditar({ userId: auth.userId, acao: "arquivar", entidade: "Cliente", entidadeId: id, request });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id } = await ctx.params;
  const cliente = await prisma.cliente.update({ where: { id }, data: { ativo: true } });
  await auditar({ userId: auth.userId, acao: "reativar", entidade: "Cliente", entidadeId: id, request });
  return NextResponse.json(cliente);
}
