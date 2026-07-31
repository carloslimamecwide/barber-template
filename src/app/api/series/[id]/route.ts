import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { cancelarSerie } from "@/lib/series";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  await cancelarSerie(id);
  return NextResponse.json({ ok: true });
}
