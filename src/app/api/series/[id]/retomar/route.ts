import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { retomarSerie } from "@/lib/series";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const { criadas } = await retomarSerie(id);
  return NextResponse.json({ criadas });
}
