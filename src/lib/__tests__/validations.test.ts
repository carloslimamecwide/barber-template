import { describe, expect, it } from "vitest";
import { agendamentoManualSchema, configuracaoSchema, dataStringSchema, horarioProfissionalSchema, horarioSchema, statusSchema } from "@/lib/validations";

describe("validação de datas e horários", () => {
  it("rejeita datas normalizáveis mas inexistentes", () => {
    expect(dataStringSchema.safeParse("2026-02-30").success).toBe(false);
    expect(dataStringSchema.safeParse("2026-13-01").success).toBe(false);
  });

  it("rejeita horário aberto sem abertura e fecho coerentes", () => {
    expect(horarioSchema.safeParse({ diaDaSemana: 1, aberto: true, abertura: "19:00", fecho: "09:00" }).success).toBe(false);
  });

  it("exige motivo quando uma marcação usa exceção administrativa", () => {
    const base = { clienteId: "c", servicoId: "s", data: "2026-08-20", hora: "10:00" };
    expect(agendamentoManualSchema.safeParse({ ...base, override: true }).success).toBe(false);
    expect(agendamentoManualSchema.safeParse({ ...base, override: true, overrideReason: "Abertura especial" }).success).toBe(true);
  });

  it("exige motivo para cancelamento e falta", () => {
    expect(statusSchema.safeParse({ status: "cancelado" }).success).toBe(false);
    expect(statusSchema.safeParse({ status: "faltou", motivoStatus: "Não apareceu" }).success).toBe(true);
    expect(statusSchema.safeParse({ status: "concluido" }).success).toBe(true);
  });

  it("valida limites da configuração operacional", () => {
    const base = { nome: "Barbearia", timezone: "Europe/Lisbon", intervaloSlotsMin: 15, antecedenciaMinHoras: 2, horizonteDias: 90, cancelamentoMinHoras: 24, lembreteHoras: 24 };
    expect(configuracaoSchema.safeParse(base).success).toBe(true);
    expect(configuracaoSchema.safeParse({ ...base, horizonteDias: 2 }).success).toBe(false);
    expect(configuracaoSchema.safeParse({ ...base, timezone: "UTC" }).success).toBe(false);
  });

  it("rejeita horário individual com pausa incompleta", () => {
    expect(horarioProfissionalSchema.safeParse({ diaDaSemana: 1, ativo: true, abertura: "09:00", fecho: "18:00", pausaInicio: "13:00" }).success).toBe(false);
  });
});
