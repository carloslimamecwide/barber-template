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

export const TIME_ZONE = "Europe/Lisbon";
export const SLOT_INTERVAL_MIN = 15;

const formatterData = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function partesEmLisboa(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

export function toDateOnlyString(d: Date): string {
  return formatterData.format(d);
}

export function dateOnlyToDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function combineDateAndTime(dateStr: string, hhmm: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const pretendUtc = Date.UTC(y, m - 1, d, hh, mm);
  let candidate = new Date(pretendUtc);
  for (let i = 0; i < 2; i++) {
    const p = partesEmLisboa(candidate);
    const represented = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second),
    );
    candidate = new Date(candidate.getTime() + pretendUtc - represented);
  }
  const roundTrip = partesEmLisboa(candidate);
  if (
    Number(roundTrip.year) !== y || Number(roundTrip.month) !== m ||
    Number(roundTrip.day) !== d || Number(roundTrip.hour) !== hh ||
    Number(roundTrip.minute) !== mm
  ) {
    throw new Error("Data/hora inexistente em Europe/Lisbon");
  }
  return candidate;
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
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

export interface GerarSlotsInput {
  data: string;
  duracaoMin: number;
  horario: HorarioDia;
  ocupacoes: Ocupacao[];
  agora?: Date;
  intervaloMin?: number;
}

export function gerarSlots({
  data,
  duracaoMin,
  horario,
  ocupacoes,
  agora = new Date(),
  intervaloMin = SLOT_INTERVAL_MIN,
}: GerarSlotsInput): string[] {
  if (!horario.aberto || !horario.abertura || !horario.fecho) return [];
  const abertura = hhmmToMinutes(horario.abertura);
  const fecho = hhmmToMinutes(horario.fecho);
  if (fecho <= abertura || duracaoMin <= 0) return [];

  const hoje = toDateOnlyString(agora);
  const slots: string[] = [];

  for (let start = abertura; start + duracaoMin <= fecho; start += intervaloMin) {
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
