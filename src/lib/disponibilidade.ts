import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  combineDateAndTime,
  dateOnlyToDate,
  diaDaSemana,
  gerarSlots,
  type HorarioDia,
  type Ocupacao,
} from "@/lib/horarios";

type Db = typeof prisma | Prisma.TransactionClient;

export class DisponibilidadeError extends Error {
  constructor(
    public readonly code: "FECHADO" | "PASSADO" | "OCUPADO" | "FORA_DO_HORARIO" | "PROFISSIONAL_INATIVO",
    message: string,
  ) {
    super(message);
  }
}

export async function obterOcupacoesDoDia(
  data: string,
  excluirId?: string,
  profissionalId?: string,
  db: Db = prisma,
): Promise<Ocupacao[]> {
  const inicio = combineDateAndTime(data, "00:00");
  const fim = combineDateAndTime(data, "23:59");
  const agendamentos = await db.agendamento.findMany({
    where: {
      dataHora: { gte: inicio, lte: fim },
      status: { in: ["agendado", "concluido"] },
      arquivadoEm: null,
      ...(profissionalId ? { profissionalId } : {}),
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
    select: { dataHora: true, duracaoAgendadaMin: true },
  });
  return agendamentos.map((a) => ({
    inicio: a.dataHora,
    fim: new Date(a.dataHora.getTime() + a.duracaoAgendadaMin * 60000),
  }));
}

export async function obterHorarioDoDia(data: string, db: Db = prisma): Promise<HorarioDia> {
  const dia = diaDaSemana(data);
  const horario = await db.horarioFuncionamento.findUnique({ where: { diaDaSemana: dia } });
  const fechado = await db.diaFechado.findUnique({ where: { data: dateOnlyToDate(data) } });
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

export async function slotsDoProfissional(input: {
  data: string;
  duracaoMin: number;
  profissionalId: string;
  excluirId?: string;
  agora?: Date;
  db?: Db;
}) {
  const db = input.db ?? prisma;
  const horario = await obterHorarioDoDia(input.data, db);
  const ocupacoes = await obterOcupacoesDoDia(input.data, input.excluirId, input.profissionalId, db);
  return gerarSlots({
    data: input.data,
    duracaoMin: input.duracaoMin,
    horario,
    ocupacoes,
    agora: input.agora,
  });
}

export async function validarSlot(input: {
  data: string;
  hora: string;
  duracaoMin: number;
  profissionalId: string;
  excluirId?: string;
  permitirExcecao?: boolean;
  db?: Db;
}) {
  const db = input.db ?? prisma;
  const profissional = await db.profissional.findUnique({ where: { id: input.profissionalId } });
  if (!profissional?.ativo) {
    throw new DisponibilidadeError("PROFISSIONAL_INATIVO", "Profissional não encontrado ou inativo");
  }

  const inicio = combineDateAndTime(input.data, input.hora);
  if (inicio <= new Date() && !input.permitirExcecao) {
    throw new DisponibilidadeError("PASSADO", "A data/hora tem de estar no futuro");
  }

  const ocupacoes = await obterOcupacoesDoDia(input.data, input.excluirId, input.profissionalId, db);
  const fim = new Date(inicio.getTime() + input.duracaoMin * 60000);
  const ocupado = ocupacoes.some((o) => inicio < o.fim && fim > o.inicio);
  if (ocupado && !input.permitirExcecao) {
    throw new DisponibilidadeError("OCUPADO", "Esta hora já está ocupada");
  }

  const horario = await obterHorarioDoDia(input.data, db);
  const slotRegular = gerarSlots({
    data: input.data,
    duracaoMin: input.duracaoMin,
    horario,
    ocupacoes: [],
  }).includes(input.hora);
  if (!slotRegular && !input.permitirExcecao) {
    throw new DisponibilidadeError(
      horario.aberto ? "FORA_DO_HORARIO" : "FECHADO",
      horario.aberto ? "A hora fica fora do horário de funcionamento" : "A barbearia está fechada neste dia",
    );
  }
  return inicio;
}

export async function escolherProfissional(input: {
  data: string;
  hora: string;
  duracaoMin: number;
  profissionalId?: string;
  excluirId?: string;
  permitirExcecao?: boolean;
  db?: Db;
}) {
  const db = input.db ?? prisma;
  const profissionais = await db.profissional.findMany({
    where: { ativo: true, ...(input.profissionalId ? { id: input.profissionalId } : {}) },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });
  if (profissionais.length === 0) {
    throw new DisponibilidadeError("PROFISSIONAL_INATIVO", "Não existem profissionais ativos disponíveis");
  }
  let ultimoErro: unknown;
  for (const profissional of profissionais) {
    try {
      const dataHora = await validarSlot({ ...input, profissionalId: profissional.id, db });
      return { profissional, dataHora };
    } catch (error) {
      ultimoErro = error;
    }
  }
  throw ultimoErro instanceof Error
    ? ultimoErro
    : new DisponibilidadeError("OCUPADO", "Não existe profissional disponível nesta hora");
}
