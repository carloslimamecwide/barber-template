import { describe, expect, it } from "vitest";
import { datasOcorrencia, slotValido } from "@/lib/recorrencia";

describe("datasOcorrencia", () => {
  it("alinhar semana a partir de uma data de fase", () => {
    expect(datasOcorrencia({
      diaDaSemana: 6,
      intervaloSemanas: 1,
      dataInicio: "2026-08-08", // sábado
      dataFim: "2026-08-31",
    })).toEqual(["2026-08-08", "2026-08-15", "2026-08-22", "2026-08-29"]);
  });

  it("respeita o intervalo de 15 em 15 dias (a cada 2 semanas)", () => {
    expect(datasOcorrencia({
      diaDaSemana: 6,
      intervaloSemanas: 2,
      dataInicio: "2026-08-08",
      dataFim: "2026-09-05",
    })).toEqual(["2026-08-08", "2026-08-22", "2026-09-05"]);
  });

  it("alinhar para a frente quando dataInicio não é o dia da semana", () => {
    expect(datasOcorrencia({
      diaDaSemana: 6,
      intervaloSemanas: 1,
      dataInicio: "2026-08-03", // segunda-feira
      dataFim: "2026-08-31",
    })).toEqual(["2026-08-08", "2026-08-15", "2026-08-22", "2026-08-29"]);
  });

  it("devolve vazio quando dataFim é antes da primeira ocorrência", () => {
    expect(datasOcorrencia({
      diaDaSemana: 6,
      intervaloSemanas: 1,
      dataInicio: "2026-08-08",
      dataFim: "2026-08-07",
    })).toEqual([]);
  });
});

describe("slotValido", () => {
  it("aceita hora presente nos slots livres", () => {
    expect(slotValido(["09:00", "09:30"], "09:30")).toBe(true);
  });
  it("rejeita hora ocupada ou fora do horário", () => {
    expect(slotValido(["09:00", "09:30"], "18:00")).toBe(false);
  });
});
