import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clienteSchema } from "@/lib/validations";

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
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
  return NextResponse.json(cliente);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  await prisma.cliente.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
