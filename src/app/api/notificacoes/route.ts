import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { paginated, pagination } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(request: Request) {
  if (!(await requireStaff())) return apiError("FORBIDDEN", "Sem permissão", 403);
  const params = new URL(request.url).searchParams;
  const { page, pageSize, skip } = pagination(params);
  const estado = z.enum(["pendente", "processando", "enviada", "falhada"]).safeParse(params.get("estado"));
  const where = estado.success ? { estado: estado.data } : {};
  const [items, total, ultimaExecucao] = await Promise.all([
    prisma.notificacao.findMany({ where, include: { agendamento: { select: { dataHora: true, cliente: { select: { nome: true } }, servico: { select: { nome: true } } } } }, orderBy: { criadaEm: "desc" }, skip, take: pageSize }),
    prisma.notificacao.count({ where }),
    prisma.execucaoCron.findFirst({ orderBy: { inicio: "desc" } }),
  ]);
  return NextResponse.json({ ...paginated(items, page, pageSize, total), ultimaExecucao });
}

export async function POST(request: Request) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const schema = z.object({ ids: z.array(z.string()).max(100).optional(), todasFalhadas: z.boolean().optional() });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.ids?.length && !parsed.data.todasFalhadas)) return apiError("VALIDATION_ERROR", "Indica notificações para reenviar", 422);
  const result = await prisma.notificacao.updateMany({
    where: { estado: "falhada", ...(parsed.data.ids?.length ? { id: { in: parsed.data.ids } } : {}) },
    data: { estado: "pendente", tentativas: 0, proximaTentativaEm: new Date(), ultimoErro: null },
  });
  await auditar({ userId: auth.userId, acao: "retry", entidade: "Notificacao", dados: { quantidade: result.count }, request });
  return NextResponse.json({ atualizadas: result.count });
}
