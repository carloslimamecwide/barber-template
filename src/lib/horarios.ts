export interface HorarioDia {
  aberto: boolean;
  abertura: string | null;
  fecho: string | null;
  pausaInicio?: string | null;
  pausaFim?: string | null;
}

export interface Ocupacao {
  inicio: Date;
  fim: Date;
}

export function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateOnlyToDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function combineDateAndTime(dateStr: string, hhmm: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export function minutesToHhmm(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function diaDaSemana(dateStr: string): number {
  return dateOnlyToDate(dateStr).getDay();
}

export interface GerarSlotsInput {
  data: string;
  duracaoMin: number;
  horario: HorarioDia;
  ocupacoes: Ocupacao[];
  agora?: Date;
}

export function gerarSlots({
  data,
  duracaoMin,
  horario,
  ocupacoes,
  agora = new Date(),
}: GerarSlotsInput): string[] {
  if (!horario.aberto || !horario.abertura || !horario.fecho) return [];
  const abertura = hhmmToMinutes(horario.abertura);
  const fecho = hhmmToMinutes(horario.fecho);
  if (fecho <= abertura || duracaoMin <= 0) return [];

  const hoje = toDateOnlyString(agora);
  const slots: string[] = [];

  for (let start = abertura; start + duracaoMin <= fecho; start += duracaoMin) {
    const slotInicio = combineDateAndTime(data, minutesToHhmm(start));
    const slotFim = new Date(slotInicio.getTime() + duracaoMin * 60000);

    const pausaInicio = horario.pausaInicio ? hhmmToMinutes(horario.pausaInicio) : null;
    const pausaFim = horario.pausaFim ? hhmmToMinutes(horario.pausaFim) : null;
    const intervaloTemPausa =
      pausaInicio !== null && pausaFim !== null &&
      start < pausaFim && start + duracaoMin > pausaInicio;

    if (data === hoje && slotInicio <= agora) continue;
    if (intervaloTemPausa) continue;

    const ocupado = ocupacoes.some(
      (o) => slotInicio < o.fim && slotFim > o.inicio,
    );
    if (!ocupado) slots.push(minutesToHhmm(start));
  }

  return slots;
}
