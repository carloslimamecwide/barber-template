import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterHorarioDoDia, slotsDoProfissional } from "@/lib/disponibilidade";
import { dataStringSchema } from "@/lib/validations";
import { apiError } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");
  const servicoId = searchParams.get("servicoId");
  const profissionalId = searchParams.get("profissionalId") || undefined;
  if (!data || !servicoId || !dataStringSchema.safeParse(data).success) {
    return apiError("VALIDATION_ERROR", "Data e serviço válidos são obrigatórios", 422);
  }
  const [servico, profissionais, horario] = await Promise.all([
    prisma.servico.findUnique({ where: { id: servicoId } }),
    prisma.profissional.findMany({
      where: { ativo: true, ...(profissionalId ? { id: profissionalId } : {}) },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    obterHorarioDoDia(data),
  ]);
  if (!servico?.ativo) return apiError("SERVICO_INATIVO", "Serviço não encontrado", 404);
  if (!profissionais.length) return NextResponse.json({ horario, slots: [], profissionais: [], configuracaoPendente: true });

  const porProfissional = await Promise.all(profissionais.map(async (profissional) => ({
    profissional,
    slots: await slotsDoProfissional({ data, duracaoMin: servico.duracaoMin, profissionalId: profissional.id }),
  })));
  const mapa = new Map<string, { id: string; nome: string }[]>();
  for (const item of porProfissional) {
    for (const hora of item.slots) {
      mapa.set(hora, [...(mapa.get(hora) ?? []), { id: item.profissional.id, nome: item.profissional.nome }]);
    }
  }
  const detalhes = [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([hora, disponiveis]) => ({ hora, profissionais: disponiveis }));
  return NextResponse.json({
    horario,
    slots: detalhes.map((s) => s.hora),
    detalhes,
    profissionais: profissionais.map(({ id, nome }) => ({ id, nome })),
  });
}
