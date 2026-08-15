import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profissionalSchema } from "@/lib/validations";

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = profissionalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }
  const profissional = await prisma.profissional.update({
    where: { id },
    data: {
      nome: parsed.data.nome,
      telefone: parsed.data.telefone || null,
      email: parsed.data.email || null,
      ...(parsed.data.ativo === undefined ? {} : { ativo: parsed.data.ativo }),
    },
  });
  return NextResponse.json(profissional);
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  await prisma.profissional.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
