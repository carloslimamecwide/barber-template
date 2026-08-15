import { prisma } from "@/lib/prisma";
import { combineDateAndTime, gerarSlots, toDateOnlyString } from "@/lib/horarios";
import { obterHorarioDoDia, obterOcupacoesDoDia } from "@/lib/disponibilidade";
import { datasOcorrencia, fimDoAno, slotValido } from "@/lib/recorrencia";

export async function gerarOcorrenciasSerie(
  serieId: string,
  agora = new Date(),
): Promise<{ criadas: number }> {
  const serie = await prisma.serieRecorrente.findUnique({
    where: { id: serieId },
    include: { servico: true },
  });
  if (!serie || serie.estado !== "ativa") return { criadas: 0 };

  const dataFim = fimDoAno(agora);

  await prisma.agendamento.deleteMany({
    where: {
      serieId,
      status: "agendado",
      dataHora: { gt: combineDateAndTime(dataFim, "23:59") },
    },
  });

  const datas = datasOcorrencia({
    diaDaSemana: serie.diaDaSemana,
    intervaloSemanas: serie.intervaloSemanas,
    dataInicio: toDateOnlyString(serie.dataInicio),
    dataFim,
  });

  const existentes = await prisma.agendamento.findMany({
    where: { serieId },
    select: { dataHora: true },
  });
  const datasExistentes = new Set(existentes.map((a) => a.dataHora.getTime()));

  let criadas = 0;
  for (const dataStr of datas) {
    const dataHora = combineDateAndTime(dataStr, serie.hora);
    if (dataHora <= agora) continue;
    if (datasExistentes.has(dataHora.getTime())) continue;

    const [horario, ocupacoes] = await Promise.all([
      obterHorarioDoDia(dataStr),
      obterOcupacoesDoDia(dataStr, undefined, serie.profissionalId ?? undefined),
    ]);
    const slots = gerarSlots({
      data: dataStr,
      duracaoMin: serie.servico.duracaoMin,
      horario,
      ocupacoes,
      agora,
    });
    if (!slotValido(slots, serie.hora)) {
      await prisma.serieRecorrente.update({
        where: { id: serieId },
        data: { estado: "bloqueada", motivoBloqueio: dataStr, bloqueadaEm: new Date() },
      });
      return { criadas };
    }

    await prisma.agendamento.create({
      data: {
        clienteId: serie.clienteId,
        servicoId: serie.servicoId,
        profissionalId: serie.profissionalId,
        dataHora,
        status: "agendado",
        precoCobrado: serie.servico.precoCents,
        serieId,
      },
    });
    criadas++;
  }
  return { criadas };
}

export async function estenderSeries(
  agora = new Date(),
): Promise<{ estendidas: number }> {
  const series = await prisma.serieRecorrente.findMany({
    where: { estado: "ativa" },
  });
  let estendidas = 0;
  for (const serie of series) {
    const { criadas } = await gerarOcorrenciasSerie(serie.id, agora);
    if (criadas > 0) estendidas++;
  }
  return { estendidas };
}

export async function cancelarSerie(serieId: string, agora = new Date()): Promise<void> {
  await prisma.$transaction([
    prisma.serieRecorrente.update({
      where: { id: serieId },
      data: { estado: "cancelada", canceladaEm: new Date() },
    }),
    prisma.agendamento.updateMany({
      where: { serieId, dataHora: { gt: agora } },
      data: { status: "cancelado" },
    }),
  ]);
}

export async function retomarSerie(
  serieId: string,
  agora = new Date(),
): Promise<{ criadas: number }> {
  const serie = await prisma.serieRecorrente.findUnique({ where: { id: serieId } });
  if (!serie || serie.estado !== "bloqueada") return { criadas: 0 };
  await prisma.serieRecorrente.update({
    where: { id: serieId },
    data: { estado: "ativa", motivoBloqueio: null, bloqueadaEm: null },
  });
  return gerarOcorrenciasSerie(serieId, agora);
}
