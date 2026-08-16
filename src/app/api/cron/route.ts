import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { combineDateAndTime, toDateOnlyString } from "@/lib/horarios";
import { estenderSeries } from "@/lib/series";
import { enfileirarNotificacao, processarNotificacoes } from "@/lib/notificacoes";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let lembretes = 0;
  const hoje = toDateOnlyString(new Date());
  const [ano, mes, dia] = hoje.split("-").map(Number);
  const amanha = toDateOnlyString(new Date(Date.UTC(ano, mes - 1, dia + 1, 12)));
  const inicio = combineDateAndTime(amanha, "00:00");
  const fim = combineDateAndTime(amanha, "23:59");

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
  return NextResponse.json({ lembretes, estendidas, excecoes, propostasExpiradas: propostasExpiradas.count, notificacoes });
}
