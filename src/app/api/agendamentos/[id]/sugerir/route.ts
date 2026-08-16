import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { DisponibilidadeError, validarSlot } from "@/lib/disponibilidade";
import { novaHoraSchema } from "@/lib/validations";
import { criarToken } from "@/lib/tokens";
import { enfileirarNotificacao } from "@/lib/notificacoes";
import { apiError } from "@/lib/api";
import { transacaoSerializavel } from "@/lib/transactions";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const { id } = await ctx.params;
  const parsed = novaHoraSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Data/hora inválidas", 422, parsed.error.issues);
  try {
    const result = await transacaoSerializavel(async (tx) => {
      const agendamento = await tx.agendamento.findUnique({
        where: { id }, include: { servico: true, cliente: true },
      });
      if (!agendamento) throw new Error("NOT_FOUND");
      if (agendamento.status !== "agendado" || agendamento.dataHora <= new Date()) throw new Error("INVALID_STATE");
      if (!agendamento.cliente.email) throw new Error("NO_EMAIL");
      const novaDataHora = await validarSlot({
        data: parsed.data.data, hora: parsed.data.hora,
        duracaoMin: agendamento.duracaoAgendadaMin,
        profissionalId: agendamento.profissionalId, excluirId: agendamento.id, db: tx,
      });
      await tx.propostaReagendamento.updateMany({
        where: { agendamentoId: id, status: "pendente" },
        data: { status: "expirada", respondidaEm: new Date() },
      });
      const token = criarToken();
      const proposta = await tx.propostaReagendamento.create({
        data: {
          agendamentoId: id, tokenHash: token.hash,
          dataHoraAtual: agendamento.dataHora, novaDataHora,
          expiraEm: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      });
      const notificacao = await enfileirarNotificacao(tx, {
        agendamentoId: id, tipo: "proposta", destinatario: agendamento.cliente.email,
        payload: {
          email: agendamento.cliente.email, nome: agendamento.cliente.nome,
          servico: agendamento.servico.nome, horaAtual: agendamento.dataHora.toISOString(),
          novaHora: novaDataHora.toISOString(), token: token.token,
        },
      });
      return { proposta, notificacao };
    });
    return NextResponse.json({ proposta: result.proposta, notificacao: { status: result.notificacao.estado } }, { status: 201 });
  } catch (error) {
    if (error instanceof DisponibilidadeError) return apiError(error.code, error.message, 409);
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") return apiError("NOT_FOUND", "Agendamento não encontrado", 404);
    if (code === "INVALID_STATE") return apiError("INVALID_STATE", "A marcação já não admite propostas", 409);
    if (code === "NO_EMAIL") return apiError("NO_EMAIL", "O cliente não tem email", 409);
    console.error("Erro ao sugerir horário", error);
    return apiError("INTERNAL_ERROR", "Não foi possível criar a proposta", 500);
  }
}
