import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await ctx.params;
  const result = await prisma.notificacao.updateMany({
    where: { id, estado: "falhada" },
    data: { estado: "pendente", tentativas: 0, proximaTentativaEm: new Date(), ultimoErro: null },
  });
  if (!result.count) return NextResponse.json({ error: "Notificação não encontrada ou não falhou" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
