import { dateOnlyToDate, toDateOnlyString } from "@/lib/horarios";

export const JANELA_DIAS = 365;

export function datasOcorrencia(input: {
  diaDaSemana: number;
  intervaloSemanas: number;
  dataInicio: string;
  dataFim: string;
}): string[] {
  const { diaDaSemana, intervaloSemanas, dataInicio, dataFim } = input;
  const atual = dateOnlyToDate(dataInicio);
  const fim = dateOnlyToDate(dataFim);
  const diff = (diaDaSemana - atual.getDay() + 7) % 7;
  atual.setDate(atual.getDate() + diff);

  const datas: string[] = [];
  while (atual <= fim) {
    datas.push(toDateOnlyString(atual));
    atual.setDate(atual.getDate() + intervaloSemanas * 7);
  }
  return datas;
}

export function slotValido(slots: string[], hora: string): boolean {
  return slots.includes(hora);
}
