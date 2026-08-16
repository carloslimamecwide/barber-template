import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clienteSchema } from "@/lib/validations";
import { apiError } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { pagination, paginated } from "@/lib/pagination";

export async function GET(request: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const search = params.get("search")?.trim();
  const ativo = params.get("ativo");
  const where = {
    ...(search ? { OR: [{ nome: { contains: search, mode: "insensitive" as const } }, { telefone: { contains: search } }, { email: { contains: search, mode: "insensitive" as const } }] } : {}),
    ...(ativo === "true" ? { ativo: true } : ativo === "false" ? { ativo: false } : {}),
  };
  const paginar = params.has("page") || params.has("pageSize");
  const { page, pageSize, skip } = pagination(params);
  const clientes = await prisma.cliente.findMany({
    where,
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: { _count: { select: { agendamentos: true } } },
    ...(paginar ? { skip, take: pageSize } : {}),
  });
  if (!paginar) return NextResponse.json(clientes);
  return NextResponse.json(paginated(clientes, page, pageSize, await prisma.cliente.count({ where })));
}

export async function POST(request: Request) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const body = await request.json().catch(() => null);
  const parsed = clienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const emailNormalizado = parsed.data.email?.trim().toLowerCase() || null;
  const cliente = await prisma.cliente.create({ data: { ...parsed.data, email: emailNormalizado, emailNormalizado } });
  await auditar({ userId: auth.userId, acao: "criar", entidade: "Cliente", entidadeId: cliente.id, request });
  return NextResponse.json(cliente, { status: 201 });
}
