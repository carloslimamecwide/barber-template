import { prisma } from "@/lib/prisma";
import { criarAgendamento } from "@/lib/agendamentos";
import { combineDateAndTime, toDateOnlyString } from "@/lib/horarios";
import { datasOcorrencia } from "@/lib/recorrencia";

function horizonte(agora: Date) {
  const fim = new Date(agora);
  fim.setUTCFullYear(fim.getUTCFullYear() + 1);
  return toDateOnlyString(fim);
}

export async function gerarOcorrenciasSerie(serieId: string, agora = new Date()) {
  const serie = await prisma.serieRecorrente.findUnique({
    where: { id: serieId }, include: { servico: true, cliente: true },
  });
  if (!serie || serie.estado !== "ativa") return { criadas: 0, excecoes: 0 };

  const datas = datasOcorrencia({
    diaDaSemana: serie.diaDaSemana,
    intervaloSemanas: serie.intervaloSemanas,
    dataInicio: toDateOnlyString(serie.dataInicio),
    dataFim: horizonte(agora),
  });
  const existentes = await prisma.agendamento.findMany({
    where: { serieId }, select: { dataHora: true },
  });
  const datasExistentes = new Set(existentes.map((item) => item.dataHora.getTime()));
  let criadas = 0;
  let excecoes = 0;
  for (const data of datas) {
    const dataHoraPlaneada = combineDateAndTime(data, serie.hora);
    if (dataHoraPlaneada <= agora || datasExistentes.has(dataHoraPlaneada.getTime())) continue;
    try {
      await criarAgendamento({
        clienteId: serie.clienteId,
        servicoId: serie.servicoId,
        profissionalId: serie.profissionalId ?? undefined,
        data,
        hora: serie.hora,
        serieId,
        notificar: false,
      });
      await prisma.excecaoSerie.updateMany({
        where: { serieId, dataHora: dataHoraPlaneada, resolvidaEm: null },
        data: { resolvidaEm: new Date() },
      });
      criadas++;
    } catch (error) {
      await prisma.excecaoSerie.upsert({
        where: { serieId_dataHora: { serieId, dataHora: dataHoraPlaneada } },
        update: { motivo: error instanceof Error ? error.message : "Horário indisponível", resolvidaEm: null },
        create: { serieId, dataHora: dataHoraPlaneada, motivo: error instanceof Error ? error.message : "Horário indisponível" },
      });
      excecoes++;
    }
  }
  return { criadas, excecoes };
}

export async function estenderSeries(agora = new Date()) {
  const series = await prisma.serieRecorrente.findMany({ where: { estado: "ativa" } });
  let estendidas = 0;
  let excecoes = 0;
  for (const serie of series) {
    const result = await gerarOcorrenciasSerie(serie.id, agora);
    if (result.criadas) estendidas++;
    excecoes += result.excecoes;
  }
  return { estendidas, excecoes };
}

export async function cancelarSerie(serieId: string, agora = new Date()) {
  await prisma.$transaction([
    prisma.serieRecorrente.update({ where: { id: serieId }, data: { estado: "cancelada", canceladaEm: new Date() } }),
    prisma.agendamento.updateMany({ where: { serieId, dataHora: { gt: agora }, status: "agendado" }, data: { status: "cancelado" } }),
  ]);
}
