import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { servicoSchema } from "@/lib/validations";
import { auditar } from "@/lib/audit";
import { apiError } from "@/lib/api";

export async function GET() {
  const servicos = await prisma.servico.findMany({
    orderBy: { nome: "asc" },
    include: { servicos: { include: { profissional: { select: { id: true, nome: true, ativo: true } } } } },
  });
  return NextResponse.json(servicos);
}

export async function POST(request: Request) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
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
      ...(parsed.data.profissionalIds?.length ? { servicos: { create: parsed.data.profissionalIds.map((profissionalId) => ({ profissionalId })) } } : {}),
    },
    include: { servicos: { include: { profissional: { select: { id: true, nome: true, ativo: true } } } } },
  });
  await auditar({ userId: auth.userId, acao: "criar", entidade: "Servico", entidadeId: servico.id, request });
  return NextResponse.json(servico, { status: 201 });
}
