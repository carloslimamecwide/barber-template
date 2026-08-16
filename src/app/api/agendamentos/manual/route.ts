import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { agendamentoManualSchema } from "@/lib/validations";
import { criarAgendamento } from "@/lib/agendamentos";
import { DisponibilidadeError } from "@/lib/disponibilidade";
import { apiError } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const auth = await requireStaff();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const parsed = agendamentoManualSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Dados inválidos", 422, parsed.error.issues);
  const { override, overrideReason, ...data } = parsed.data;
  try {
    const result = await criarAgendamento({
      ...data,
      permitirExcecao: override,
      motivoExcecao: overrideReason,
      notificar: false,
    });
    await auditar({ userId: auth.userId, acao: override ? "criar_excecao" : "criar", entidade: "Agendamento", entidadeId: result.agendamento.id, dados: overrideReason ? { motivo: overrideReason } : undefined, request });
    return NextResponse.json({ agendamento: result.agendamento }, { status: 201 });
  } catch (error) {
    if (error instanceof DisponibilidadeError) {
      return apiError(override ? error.code : "OVERRIDE_REQUIRED", error.message, 409);
    }
    const known = error instanceof Error ? error.message : "";
    if (["SERVICO_INATIVO", "CLIENTE_INATIVO", "SEM_PROFISSIONAIS"].includes(known)) {
      return apiError(known, "Cliente, serviço ou profissional inválido/inativo", 409);
    }
    logger.error("booking.manual_create_failed", error, { userId: auth.userId });
    return apiError("INTERNAL_ERROR", "Não foi possível criar a marcação", 500);
  }
}
