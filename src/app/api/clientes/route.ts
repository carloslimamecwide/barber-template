import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clienteSchema } from "@/lib/validations";

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const clientes = await prisma.cliente.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: { _count: { select: { agendamentos: true } } },
  });
  return NextResponse.json(clientes);
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = clienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const emailNormalizado = parsed.data.email?.trim().toLowerCase() || null;
  const cliente = await prisma.cliente.create({ data: { ...parsed.data, email: emailNormalizado, emailNormalizado } });
  return NextResponse.json(cliente, { status: 201 });
}
