import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarSlots } from "@/lib/horarios";
import { obterHorarioDoDia, obterOcupacoesDoDia } from "@/lib/disponibilidade";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");
  const servicoId = searchParams.get("servicoId");
  const profissionalId = searchParams.get("profissionalId") || undefined;

  if (!data || !servicoId) {
    return NextResponse.json(
      { error: "Parâmetros data e servicoId obrigatórios" },
      { status: 400 },
    );
  }

  const servico = await prisma.servico.findUnique({ where: { id: servicoId } });
  if (!servico || !servico.ativo) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const [horario, profissionais] = await Promise.all([
    obterHorarioDoDia(data),
    prisma.profissional.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
  ]);

  if (!horario.aberto) {
    return NextResponse.json({ horario: horario, slots: [] });
  }

  const ids: (string | undefined)[] = profissionalId
    ? [profissionalId]
    : profissionais.length > 0
      ? profissionais.map((p) => p.id)
      : [undefined];
  const slotsPorProfissional = await Promise.all(ids.map(async (id) => gerarSlots({
    data,
    duracaoMin: servico.duracaoMin,
    horario,
    ocupacoes: await obterOcupacoesDoDia(data, undefined, id),
  })));
  const slots = [...new Set(slotsPorProfissional.flat())].sort();

  return NextResponse.json({ horario, slots, profissionais });
}
