import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarOcorrenciasSerie } from "@/lib/series";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string; exceptionId: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id, exceptionId } = await ctx.params;
  const exception = await prisma.excecaoSerie.findFirst({ where: { id: exceptionId, serieId: id } });
  if (!exception) return NextResponse.json({ error: "Exceção não encontrada" }, { status: 404 });
  const result = await gerarOcorrenciasSerie(id);
  const atual = await prisma.excecaoSerie.findUnique({ where: { id: exceptionId } });
  return NextResponse.json({ ...result, resolvida: Boolean(atual?.resolvidaEm) });
}
