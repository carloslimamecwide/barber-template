import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { paginated, pagination } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await requireAdmin())) return apiError("FORBIDDEN", "Sem permissão", 403);
  const params = new URL(request.url).searchParams;
  const { page, pageSize, skip } = pagination(params);
  const entidade = params.get("entidade") || undefined;
  const where = entidade ? { entidade } : {};
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { user: { select: { email: true } } }, orderBy: { criadoEm: "desc" }, skip, take: pageSize }),
    prisma.auditLog.count({ where }),
  ]);
  return NextResponse.json(paginated(items, page, pageSize, total));
}
