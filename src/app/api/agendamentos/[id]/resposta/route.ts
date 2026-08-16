import { NextResponse } from "next/server";
import { DisponibilidadeError, validarSlot } from "@/lib/disponibilidade";
import { hashToken } from "@/lib/tokens";
import { toDateOnlyString } from "@/lib/horarios";
import { apiError } from "@/lib/api";
import { transacaoSerializavel } from "@/lib/transactions";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: token } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (body?.decisao !== "confirmar" && body?.decisao !== "recusar") {
    return apiError("VALIDATION_ERROR", "Decisão inválida", 422);
  }
  try {
    const resultado = await transacaoSerializavel(async (tx) => {
      const proposta = await tx.propostaReagendamento.findUnique({
        where: { tokenHash: hashToken(token) }, include: { agendamento: true },
      });
      if (!proposta) throw new Error("NOT_FOUND");
      if (proposta.status !== "pendente") return proposta.status === "confirmada" ? "confirmado" : "recusado";
      if (proposta.expiraEm < new Date()) {
        await tx.propostaReagendamento.update({ where: { id: proposta.id }, data: { status: "expirada" } });
        throw new Error("EXPIRED");
      }
      if (proposta.agendamento.status !== "agendado" || proposta.agendamento.dataHora <= new Date()) throw new Error("INVALID_STATE");
      if (body.decisao === "recusar") {
        await tx.propostaReagendamento.update({
          where: { id: proposta.id }, data: { status: "recusada", respondidaEm: new Date() },
        });
        return "recusado";
      }
      const data = toDateOnlyString(proposta.novaDataHora);
      const hora = new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(proposta.novaDataHora);
      await validarSlot({
        data, hora, duracaoMin: proposta.agendamento.duracaoAgendadaMin,
        profissionalId: proposta.agendamento.profissionalId,
        excluirId: proposta.agendamentoId, db: tx,
      });
      await tx.agendamento.update({ where: { id: proposta.agendamentoId }, data: { dataHora: proposta.novaDataHora } });
      await tx.propostaReagendamento.update({ where: { id: proposta.id }, data: { status: "confirmada", respondidaEm: new Date() } });
      return "confirmado";
    });
    return NextResponse.json({ ok: true, resultado });
  } catch (error) {
    if (error instanceof DisponibilidadeError) return apiError(error.code, "Esta hora já não está disponível", 409);
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") return apiError("NOT_FOUND", "Proposta não encontrada", 404);
    if (code === "EXPIRED") return apiError("EXPIRED", "Esta proposta expirou", 410);
    if (code === "INVALID_STATE") return apiError("INVALID_STATE", "A marcação já não pode ser alterada", 409);
    console.error("Erro ao responder proposta", error);
    return apiError("INTERNAL_ERROR", "Não foi possível responder", 500);
  }
}
