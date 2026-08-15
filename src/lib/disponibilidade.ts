import { prisma } from "@/lib/prisma";
import {
  combineDateAndTime,
  dateOnlyToDate,
  diaDaSemana,
  type HorarioDia,
  type Ocupacao,
} from "@/lib/horarios";

export async function obterOcupacoesDoDia(
  data: string,
  excluirId?: string,
  profissionalId?: string,
): Promise<Ocupacao[]> {
  const inicio = combineDateAndTime(data, "00:00");
  const fim = combineDateAndTime(data, "23:59");
  const agendamentos = await prisma.agendamento.findMany({
    where: {
      dataHora: { gte: inicio, lte: fim },
      status: { in: ["agendado", "concluido"] },
      ...(profissionalId ? { profissionalId } : {}),
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
    include: { servico: true },
  });
  return agendamentos.map((a) => ({
    inicio: a.dataHora,
    fim: new Date(a.dataHora.getTime() + a.servico.duracaoMin * 60000),
  }));
}

export async function obterHorarioDoDia(data: string): Promise<HorarioDia> {
  const dia = diaDaSemana(data);
  const [horario, fechado] = await Promise.all([
    prisma.horarioFuncionamento.findUnique({ where: { diaDaSemana: dia } }),
    prisma.diaFechado.findUnique({ where: { data: dateOnlyToDate(data) } }),
  ]);
  if (fechado || !horario?.aberto) {
    return { aberto: false, abertura: null, fecho: null, pausaInicio: null, pausaFim: null };
  }
  return {
    aberto: true,
    abertura: horario.abertura,
    fecho: horario.fecho,
    pausaInicio: horario.pausaInicio,
    pausaFim: horario.pausaFim,
  };
}

export async function slotLivre(
  data: string,
  hora: string,
  duracaoMin: number,
  excluirId?: string,
  profissionalId?: string,
): Promise<boolean> {
  const inicio = combineDateAndTime(data, hora);
  const fim = new Date(inicio.getTime() + duracaoMin * 60000);
  const ocupacoes = await obterOcupacoesDoDia(data, excluirId, profissionalId);
  return !ocupacoes.some((o) => inicio < o.fim && fim > o.inicio);
}
