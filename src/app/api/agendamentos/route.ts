import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { combineDateAndTime } from "@/lib/horarios";
import { toDateInputValue } from "@/lib/format";
import { agendamentoPublicoSchema } from "@/lib/validations";
import { criarAgendamento } from "@/lib/agendamentos";
import { DisponibilidadeError } from "@/lib/disponibilidade";
import { apiError } from "@/lib/api";

export async function GET(request: Request) {
  if (!(await requireAuth())) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data") ?? toDateInputValue(new Date());
  const profissionalId = searchParams.get("profissionalId") || undefined;
  const agendamentos = await prisma.agendamento.findMany({
    where: {
      dataHora: { gte: combineDateAndTime(data, "00:00"), lte: combineDateAndTime(data, "23:59") },
      arquivadoEm: null,
      ...(profissionalId ? { profissionalId } : {}),
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
  const parsed = agendamentoPublicoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Dados inválidos", 422, parsed.error.issues);
  try {
    const result = await criarAgendamento({ ...parsed.data, notificar: true });
    return NextResponse.json({
      agendamento: result.agendamento,
      notificacao: { status: result.notificacao ? "pendente" : "indisponivel" },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof DisponibilidadeError) return apiError(error.code, error.message, 409);
    if (error instanceof Error && error.message === "SEM_PROFISSIONAIS") {
      return apiError("SEM_PROFISSIONAIS", "Não existem profissionais ativos", 409);
    }
    console.error("Erro ao criar marcação pública", error);
    return apiError("INTERNAL_ERROR", "Não foi possível criar a marcação", 500);
  }
}
