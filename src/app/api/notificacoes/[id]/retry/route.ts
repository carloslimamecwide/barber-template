import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  const result = await prisma.notificacao.updateMany({
    where: { id, estado: "falhada" },
    data: { estado: "pendente", tentativas: 0, proximaTentativaEm: new Date(), ultimoErro: null },
  });
  if (!result.count) return NextResponse.json({ error: "Notificação não encontrada ou não falhou" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
