import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { servicoSchema } from "@/lib/validations";

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = servicoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const servico = await prisma.servico.update({
    where: { id },
    data: {
      nome: parsed.data.nome,
      precoCents: parsed.data.precoCents,
      duracaoMin: parsed.data.duracaoMin,
      ativo: parsed.data.ativo ?? true,
    },
  });
  return NextResponse.json(servico);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  await prisma.servico.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
