import { describe, expect, it } from "vitest";
import { agendamentoManualSchema, dataStringSchema, horarioSchema } from "@/lib/validations";

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
});
