import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estenderSeries } from "@/lib/series";
import { enfileirarNotificacao, processarNotificacoes } from "@/lib/notificacoes";
import { obterConfiguracao } from "@/lib/configuracao";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const execucao = await prisma.execucaoCron.create({ data: {} });
  try {
  let lembretes = 0;
  const configuracao = await obterConfiguracao();
  const inicio = new Date();
  const fim = new Date(inicio.getTime() + configuracao.lembreteHoras * 60 * 60_000);

  const marcacoes = await prisma.agendamento.findMany({
    where: {
      dataHora: { gte: inicio, lte: fim },
      status: "agendado",
      lembreteEnviadoEm: null,
      cliente: { email: { not: null } },
    },
    include: { cliente: true, servico: true },
  });

  for (const a of marcacoes) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.agendamento.updateMany({
        where: { id: a.id, lembreteEnviadoEm: null }, data: { lembreteEnviadoEm: new Date() },
      });
      if (!claimed.count) return;
      await enfileirarNotificacao(tx, {
        agendamentoId: a.id, tipo: "lembrete", destinatario: a.cliente.email!,
        payload: { email: a.cliente.email!, nome: a.cliente.nome, servico: a.servico.nome, dataHora: a.dataHora.toISOString() },
      });
      lembretes++;
    });
  }

  const { estendidas, excecoes } = await estenderSeries();
  const propostasExpiradas = await prisma.propostaReagendamento.updateMany({
    where: { status: "pendente", expiraEm: { lt: new Date() } },
    data: { status: "expirada" },
  });
  const notificacoes = await processarNotificacoes();
  const resultado = { lembretes, estendidas, excecoes, propostasExpiradas: propostasExpiradas.count, notificacoes };
  await prisma.$transaction([
    prisma.execucaoCron.update({ where: { id: execucao.id }, data: { fim: new Date(), sucesso: true, resultado } }),
    prisma.idempotencia.deleteMany({ where: { expiraEm: { lt: new Date() } } }),
    prisma.limiteAcesso.deleteMany({ where: { expiraEm: { lt: new Date() } } }),
  ]);
  logger.info("cron.completed", resultado);
  return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Erro desconhecido";
    await prisma.execucaoCron.update({ where: { id: execucao.id }, data: { fim: new Date(), sucesso: false, erro: message } });
    logger.error("cron.failed", error, { execucaoId: execucao.id });
    return NextResponse.json({ error: "Falha ao executar tarefas agendadas" }, { status: 500 });
  }
}
