import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { servicoSchema } from "@/lib/validations";

export async function GET() {
  const servicos = await prisma.servico.findMany({
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(servicos);
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = servicoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const servico = await prisma.servico.create({
    data: {
      nome: parsed.data.nome,
      precoCents: parsed.data.precoCents,
      duracaoMin: parsed.data.duracaoMin,
      ativo: parsed.data.ativo ?? true,
    },
  });
  return NextResponse.json(servico, { status: 201 });
}
