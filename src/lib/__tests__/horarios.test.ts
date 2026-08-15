import { describe, expect, it } from "vitest";
import {
  combineDateAndTime,
  gerarSlots,
  hhmmToMinutes,
  minutesToHhmm,
  toDateOnlyString,
  type HorarioDia,
} from "@/lib/horarios";

const horarioAberto: HorarioDia = {
  aberto: true,
  abertura: "09:00",
  fecho: "12:00",
};

function ocupacao(inicio: string, fim: string) {
  return {
    inicio: combineDateAndTime("2026-08-03", inicio),
    fim: combineDateAndTime("2026-08-03", fim),
  };
}

describe("helpers", () => {
  it("converte minutos para HH:mm", () => {
    expect(minutesToHhmm(0)).toBe("00:00");
    expect(minutesToHhmm(540)).toBe("09:00");
    expect(minutesToHhmm(600)).toBe("10:00");
  });

  it("converte HH:mm para minutos", () => {
    expect(hhmmToMinutes("09:00")).toBe(540);
    expect(hhmmToMinutes("09:30")).toBe(570);
  });

  it("converte Date para YYYY-MM-DD", () => {
    expect(toDateOnlyString(new Date(2026, 7, 3))).toBe("2026-08-03");
  });
});

describe("gerarSlots", () => {
  const agora = new Date(2026, 7, 3, 8, 0); // 03-08-2026 08:00, segunda-feira

  it("dia fechado não gera slots", () => {
    expect(gerarSlots({ data: "2026-08-03", duracaoMin: 30, horario: { aberto: false, abertura: null, fecho: null }, ocupacoes: [], agora })).toEqual([]);
  });

  it("gera slots de 30 min dentro do horário", () => {
    const slots = gerarSlots({ data: "2026-08-03", duracaoMin: 30, horario: horarioAberto, ocupacoes: [], agora });
    expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  });

  it("gera slots de 60 min e não ultrapassa o fecho", () => {
    const slots = gerarSlots({ data: "2026-08-03", duracaoMin: 60, horario: horarioAberto, ocupacoes: [], agora });
    expect(slots).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("remove slots ocupados por outra marcação", () => {
    const slots = gerarSlots({
      data: "2026-08-03",
      duracaoMin: 30,
      horario: horarioAberto,
      ocupacoes: [ocupacao("09:00", "09:30")],
      agora,
    });
    expect(slots).not.toContain("09:00");
    expect(slots).toContain("09:30");
  });

  it("remove slot quando uma marcação longa se sobrepõe", () => {
    const slots = gerarSlots({
      data: "2026-08-03",
      duracaoMin: 30,
      horario: horarioAberto,
      ocupacoes: [ocupacao("09:00", "10:00")],
      agora,
    });
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("09:30");
    expect(slots).toContain("10:00");
  });

  it("não gera slots no passado no dia atual", () => {
    const agora = new Date(2026, 7, 3, 10, 30);
    const slots = gerarSlots({ data: "2026-08-03", duracaoMin: 30, horario: horarioAberto, ocupacoes: [], agora });
    expect(slots).toEqual(["11:00", "11:30"]);
  });

  it("não bloqueia slots passados num dia futuro", () => {
    const slots = gerarSlots({ data: "2026-08-04", duracaoMin: 30, horario: horarioAberto, ocupacoes: [], agora });
    expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  });

  it("devolve vazio quando duração excede o horário", () => {
    expect(gerarSlots({ data: "2026-08-03", duracaoMin: 240, horario: horarioAberto, ocupacoes: [], agora })).toEqual([]);
  });

  it("não gera slots que atravessam a pausa", () => {
    const slots = gerarSlots({
      data: "2026-08-03",
      duracaoMin: 30,
      horario: { ...horarioAberto, pausaInicio: "10:00", pausaFim: "11:00" },
      ocupacoes: [],
      agora,
    });
    expect(slots).toEqual(["09:00", "09:30", "11:00", "11:30"]);
  });
});
