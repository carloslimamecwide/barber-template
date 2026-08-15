import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profissionalSchema } from "@/lib/validations";

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const profissionais = await prisma.profissional.findMany({
    orderBy: [{ ativo: "desc" }, { ordem: "asc" }, { nome: "asc" }],
  });
  return NextResponse.json(profissionais);
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const parsed = profissionalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }
  const profissional = await prisma.profissional.create({
    data: {
      nome: parsed.data.nome,
      telefone: parsed.data.telefone || null,
      email: parsed.data.email || null,
      ativo: parsed.data.ativo ?? true,
    },
  });
  return NextResponse.json(profissional, { status: 201 });
}
