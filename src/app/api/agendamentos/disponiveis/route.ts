import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterHorarioDoDia, slotsDoProfissional } from "@/lib/disponibilidade";
import { dataStringSchema } from "@/lib/validations";
import { apiError } from "@/lib/api";
import { obterConfiguracao } from "@/lib/configuracao";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");
  const servicoId = searchParams.get("servicoId");
  const profissionalId = searchParams.get("profissionalId") || undefined;
  if (!data || !servicoId || !dataStringSchema.safeParse(data).success) {
    return apiError("VALIDATION_ERROR", "Data e serviço válidos são obrigatórios", 422);
  }
  const servico = await prisma.servico.findUnique({ where: { id: servicoId }, include: { servicos: true } });
  if (!servico?.ativo) return apiError("SERVICO_INATIVO", "Serviço não encontrado", 404);
  const habilitados = servico.servicos.map((item) => item.profissionalId);
  const filtroProfissionais = profissionalId
    ? (!habilitados.length || habilitados.includes(profissionalId) ? [profissionalId] : [])
    : habilitados;
  const [profissionais, horario, configuracao] = await Promise.all([
    prisma.profissional.findMany({
      where: { ativo: true, ...(profissionalId || habilitados.length ? { id: { in: filtroProfissionais } } : {}) },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    obterHorarioDoDia(data),
    obterConfiguracao(),
  ]);
  if (!profissionais.length) return NextResponse.json({ horario, slots: [], profissionais: [], configuracaoPendente: true });

  const porProfissional = await Promise.all(profissionais.map(async (profissional) => {
    const personalizacao = servico.servicos.find((item) => item.profissionalId === profissional.id);
    return {
      profissional,
      slots: await slotsDoProfissional({ data, duracaoMin: personalizacao?.duracaoMin ?? servico.duracaoMin, profissionalId: profissional.id }),
    };
  }));
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
    configuracao: {
      antecedenciaMinHoras: configuracao.antecedenciaMinHoras,
      horizonteDias: configuracao.horizonteDias,
      intervaloSlotsMin: configuracao.intervaloSlotsMin,
    },
  });
}
