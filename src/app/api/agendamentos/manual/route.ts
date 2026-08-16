import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { agendamentoManualSchema } from "@/lib/validations";
import { criarAgendamento } from "@/lib/agendamentos";
import { DisponibilidadeError } from "@/lib/disponibilidade";
import { apiError } from "@/lib/api";

export async function POST(request: Request) {
  if (!(await requireAuth())) return apiError("UNAUTHORIZED", "Não autorizado", 401);
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
    return NextResponse.json({ agendamento: result.agendamento }, { status: 201 });
  } catch (error) {
    if (error instanceof DisponibilidadeError) {
      return apiError(override ? error.code : "OVERRIDE_REQUIRED", error.message, 409);
    }
    const known = error instanceof Error ? error.message : "";
    if (["SERVICO_INATIVO", "CLIENTE_INATIVO", "SEM_PROFISSIONAIS"].includes(known)) {
      return apiError(known, "Cliente, serviço ou profissional inválido/inativo", 409);
    }
    console.error("Erro ao criar marcação manual", error);
    return apiError("INTERNAL_ERROR", "Não foi possível criar a marcação", 500);
  }
}
