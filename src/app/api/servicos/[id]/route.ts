import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { servicoSchema } from "@/lib/validations";
import { auditar } from "@/lib/audit";
import { apiError } from "@/lib/api";

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = servicoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const servico = await prisma.$transaction(async (tx) => {
    await tx.servicoProfissional.deleteMany({ where: { servicoId: id } });
    return tx.servico.update({
      where: { id },
      data: {
        nome: parsed.data.nome, precoCents: parsed.data.precoCents,
        duracaoMin: parsed.data.duracaoMin, ativo: parsed.data.ativo ?? true,
        ...(parsed.data.profissionalIds?.length ? { servicos: { create: parsed.data.profissionalIds.map((profissionalId) => ({ profissionalId })) } } : {}),
      },
      include: { servicos: { include: { profissional: { select: { id: true, nome: true, ativo: true } } } } },
    });
  });
  await auditar({ userId: auth.userId, acao: "atualizar", entidade: "Servico", entidadeId: id, request });
  return NextResponse.json(servico);
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id } = await ctx.params;
  await prisma.servico.update({ where: { id }, data: { ativo: false } });
  await auditar({ userId: auth.userId, acao: "arquivar", entidade: "Servico", entidadeId: id, request });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (!auth) return apiError("FORBIDDEN", "Sem permissão", 403);
  const { id } = await ctx.params;
  const servico = await prisma.servico.update({ where: { id }, data: { ativo: true } });
  await auditar({ userId: auth.userId, acao: "reativar", entidade: "Servico", entidadeId: id, request });
  return NextResponse.json(servico);
}
