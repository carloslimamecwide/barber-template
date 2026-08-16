import { prisma } from "@/lib/prisma";
import type { Prisma, TipoNotificacao } from "@/generated/prisma/client";
import { enviarEmailConfirmacao, enviarEmailLembrete, enviarEmailSugestao } from "@/lib/email";

const ATRASOS_MIN = [1, 5, 30, 120, 720];

export async function enfileirarNotificacao(
  db: Prisma.TransactionClient,
  input: {
    agendamentoId?: string;
    tipo: TipoNotificacao;
    destinatario: string;
    payload: Prisma.InputJsonValue;
    proximaTentativaEm?: Date;
  },
) {
  return db.notificacao.create({ data: input });
}

async function enviar(tipo: TipoNotificacao, payload: unknown) {
  const value = payload as Record<string, unknown>;
  if (tipo === "confirmacao") {
    return enviarEmailConfirmacao({
      email: String(value.email), nome: String(value.nome), servico: String(value.servico),
      dataHora: new Date(String(value.dataHora)), precoCents: Number(value.precoCents),
      tokenGestao: String(value.tokenGestao),
    });
  }
  if (tipo === "proposta") {
    return enviarEmailSugestao({
      email: String(value.email), nome: String(value.nome), servico: String(value.servico),
      horaAtual: new Date(String(value.horaAtual)), novaHora: new Date(String(value.novaHora)),
      token: String(value.token),
    });
  }
  return enviarEmailLembrete({
    email: String(value.email), nome: String(value.nome), servico: String(value.servico),
    dataHora: new Date(String(value.dataHora)),
  });
}

export async function processarNotificacoes(limite = 25) {
  const agora = new Date();
  const pendentes = await prisma.notificacao.findMany({
    where: {
      estado: { in: ["pendente", "falhada", "processando"] },
      proximaTentativaEm: { lte: agora },
      tentativas: { lt: ATRASOS_MIN.length },
    },
    orderBy: { criadaEm: "asc" },
    take: limite,
  });
  let enviadas = 0;
  for (const notificacao of pendentes) {
    const claimed = await prisma.notificacao.updateMany({
      where: { id: notificacao.id, estado: { in: ["pendente", "falhada", "processando"] }, proximaTentativaEm: { lte: agora } },
      data: { estado: "processando", proximaTentativaEm: new Date(Date.now() + 10 * 60_000) },
    });
    if (!claimed.count) continue;
    try {
      await enviar(notificacao.tipo, notificacao.payload);
      await prisma.notificacao.update({
        where: { id: notificacao.id },
        data: { estado: "enviada", enviadaEm: new Date(), ultimoErro: null, payload: { processada: true } },
      });
      enviadas++;
    } catch (error) {
      const tentativas = notificacao.tentativas + 1;
      const atraso = ATRASOS_MIN[Math.min(tentativas, ATRASOS_MIN.length - 1)];
      await prisma.notificacao.update({
        where: { id: notificacao.id },
        data: {
          estado: "falhada",
          tentativas,
          ultimoErro: error instanceof Error ? error.message.slice(0, 500) : "Erro desconhecido",
          proximaTentativaEm: new Date(Date.now() + atraso * 60_000),
        },
      });
    }
  }
  return { processadas: pendentes.length, enviadas };
}
