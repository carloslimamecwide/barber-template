import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { combineDateAndTime, toDateOnlyString } from "@/lib/horarios";
import { enviarEmailLembrete } from "@/lib/email";
import { estenderSeries } from "@/lib/series";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let lembretes = 0;
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const inicio = combineDateAndTime(toDateOnlyString(amanha), "00:00");
  const fim = combineDateAndTime(toDateOnlyString(amanha), "23:59");

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
    try {
      await enviarEmailLembrete({
        email: a.cliente.email!,
        nome: a.cliente.nome,
        servico: a.servico.nome,
        dataHora: a.dataHora,
      });
      await prisma.agendamento.update({
        where: { id: a.id },
        data: { lembreteEnviadoEm: new Date() },
      });
      lembretes++;
    } catch (e) {
      console.error("Falha ao enviar lembrete de", a.id, e);
    }
  }

  const { estendidas } = await estenderSeries();
  return NextResponse.json({ lembretes, estendidas });
}
