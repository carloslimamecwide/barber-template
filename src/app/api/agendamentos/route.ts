import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { combineDateAndTime } from "@/lib/horarios";
import { toDateInputValue } from "@/lib/format";
import { agendamentoPublicoSchema } from "@/lib/validations";
import { criarAgendamento } from "@/lib/agendamentos";
import { DisponibilidadeError } from "@/lib/disponibilidade";
import { apiError } from "@/lib/api";
import { consumirLimite } from "@/lib/rate-limit";
import { clientIp, idempotencyKey, requestHash } from "@/lib/request";
import { logger } from "@/lib/logger";
import { auditar } from "@/lib/audit";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data") ?? toDateInputValue(new Date());
  const from = searchParams.get("from") ?? data;
  const to = searchParams.get("to") ?? data;
  const profissionalId = auth.role === "profissional" ? auth.profissionalId ?? "sem-profissional" : searchParams.get("profissionalId") || undefined;
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status") as "agendado" | "concluido" | "cancelado" | "faltou" | null;
  const agendamentos = await prisma.agendamento.findMany({
    where: {
      dataHora: { gte: combineDateAndTime(from, "00:00"), lte: combineDateAndTime(to, "23:59") },
      arquivadoEm: null,
      ...(profissionalId ? { profissionalId } : {}),
      ...(status && ["agendado", "concluido", "cancelado", "faltou"].includes(status) ? { status } : {}),
      ...(search ? { OR: [{ cliente: { nome: { contains: search, mode: "insensitive" } } }, { cliente: { telefone: { contains: search } } }, { servico: { nome: { contains: search, mode: "insensitive" } } }] } : {}),
    },
    include: {
      cliente: true, servico: true, profissional: true,
      serie: { select: { id: true } },
      propostas: { where: { status: "pendente" }, select: { id: true, novaDataHora: true }, take: 1 },
      notificacoes: { orderBy: { criadaEm: "desc" }, select: { id: true, estado: true, tipo: true }, take: 1 },
    },
    orderBy: { dataHora: "asc" },
  });
  return NextResponse.json(agendamentos);
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limite = await consumirLimite({ chave: `booking:${ip}`, limite: 12, janelaMs: 15 * 60_000 });
  if (!limite.permitido) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Demasiados pedidos. Tenta novamente dentro de alguns minutos." } },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter) } },
    );
  }
  const chave = idempotencyKey(request);
  if (!chave) return apiError("IDEMPOTENCY_KEY_REQUIRED", "Falta uma chave de idempotência válida", 400);
  const body = await request.json().catch(() => null);
  const parsed = agendamentoPublicoSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Dados inválidos", 422, parsed.error.issues);
  const hash = requestHash(parsed.data);
  let reservouChave = false;
  try {
    try {
      await prisma.idempotencia.create({
        data: { chave, requestHash: hash, expiraEm: new Date(Date.now() + 24 * 60 * 60_000) },
      });
      reservouChave = true;
    } catch {
      const existente = await prisma.idempotencia.findUnique({
        where: { chave }, include: { agendamento: { include: { cliente: true, servico: true, profissional: true } } },
      });
      if (!existente || existente.requestHash !== hash) {
        return apiError("IDEMPOTENCY_CONFLICT", "Esta chave já foi usada noutro pedido", 409);
      }
      if (!existente.agendamento) return apiError("REQUEST_IN_PROGRESS", "Pedido ainda em processamento", 409);
      return NextResponse.json({ agendamento: existente.agendamento, notificacao: { status: "processada" }, repetido: true });
    }
    const result = await criarAgendamento({ ...parsed.data, notificar: true });
    await prisma.idempotencia.update({ where: { chave }, data: { agendamentoId: result.agendamento.id } });
    await auditar({ acao: "criar_publico", entidade: "Agendamento", entidadeId: result.agendamento.id, request });
    return NextResponse.json({
      agendamento: result.agendamento,
      notificacao: { status: result.notificacao ? "pendente" : "indisponivel" },
    }, { status: 201 });
  } catch (error) {
    if (reservouChave) await prisma.idempotencia.deleteMany({ where: { chave, agendamentoId: null } });
    if (error instanceof DisponibilidadeError) return apiError(error.code, error.message, 409);
    if (error instanceof Error && error.message === "SEM_PROFISSIONAIS") {
      return apiError("SEM_PROFISSIONAIS", "Não existem profissionais ativos", 409);
    }
    logger.error("booking.create_failed", error, { ip });
    return apiError("INTERNAL_ERROR", "Não foi possível criar a marcação", 500);
  }
}
