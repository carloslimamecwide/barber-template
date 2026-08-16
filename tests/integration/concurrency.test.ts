import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarAgendamento } from "@/lib/agendamentos";
import { prisma } from "@/lib/prisma";
import { toDateOnlyString } from "@/lib/horarios";

const isolated = Boolean(process.env.TEST_DATABASE_URL) && process.env.DATABASE_URL === process.env.TEST_DATABASE_URL;
const ids: { profissional?: string; servico?: string; clientes: string[]; agendamentos: string[] } = { clientes: [], agendamentos: [] };

function proximaSegunda() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + ((8 - date.getUTCDay()) % 7 || 7));
  return toDateOnlyString(date);
}

describe.skipIf(!isolated)("concorrência com PostgreSQL isolado", () => {
  beforeAll(async () => {
    const profissional = await prisma.profissional.create({ data: { nome: `Teste concorrência ${Date.now()}` } });
    const servico = await prisma.servico.create({ data: { nome: `Corte teste ${Date.now()}`, precoCents: 1000, duracaoMin: 30 } });
    ids.profissional = profissional.id; ids.servico = servico.id;
    for (const suffix of ["A", "B"]) {
      const cliente = await prisma.cliente.create({ data: { nome: `Cliente ${suffix}`, telefone: `90000000${suffix === "A" ? 1 : 2}` } });
      ids.clientes.push(cliente.id);
    }
  });

  afterAll(async () => {
    if (ids.profissional) await prisma.agendamento.deleteMany({ where: { profissionalId: ids.profissional } });
    await prisma.cliente.deleteMany({ where: { id: { in: ids.clientes } } });
    if (ids.servico) await prisma.servico.deleteMany({ where: { id: ids.servico } });
    if (ids.profissional) await prisma.profissional.deleteMany({ where: { id: ids.profissional } });
  });

  it("aceita apenas uma de duas marcações simultâneas no mesmo horário", async () => {
    const input = { servicoId: ids.servico!, profissionalId: ids.profissional!, data: proximaSegunda(), hora: "10:00", notificar: false };
    const resultados = await Promise.allSettled([
      criarAgendamento({ ...input, clienteId: ids.clientes[0] }),
      criarAgendamento({ ...input, clienteId: ids.clientes[1] }),
    ]);
    expect(resultados.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(resultados.filter((item) => item.status === "rejected")).toHaveLength(1);
  });
});
