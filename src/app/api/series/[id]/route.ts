import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { cancelarSerie } from "@/lib/series";
import { gerarOcorrenciasSerie } from "@/lib/series";
import { prisma } from "@/lib/prisma";
import { serieSchema } from "@/lib/validations";
import { dateOnlyToDate } from "@/lib/horarios";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  await cancelarSerie(id);
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = serieSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
  const agora = new Date();
  const serie = await prisma.$transaction(async (tx) => {
    const exists = await tx.serieRecorrente.findUnique({ where: { id } });
    if (!exists) return null;
    await tx.agendamento.deleteMany({
      where: { serieId: id, dataHora: { gt: agora }, status: "agendado" },
    });
    await tx.excecaoSerie.deleteMany({ where: { serieId: id, resolvidaEm: null } });
    return tx.serieRecorrente.update({
      where: { id },
      data: {
        ...parsed.data,
        profissionalId: parsed.data.profissionalId || null,
        dataInicio: dateOnlyToDate(parsed.data.dataInicio),
        estado: "ativa",
        canceladaEm: null,
      },
    });
  });
  if (!serie) return NextResponse.json({ error: "Série não encontrada" }, { status: 404 });
  const result = await gerarOcorrenciasSerie(id);
  return NextResponse.json({ serie, ...result });
}
