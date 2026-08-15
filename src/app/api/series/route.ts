import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateOnlyToDate } from "@/lib/horarios";
import { serieSchema } from "@/lib/validations";
import { gerarOcorrenciasSerie } from "@/lib/series";

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = serieSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const { clienteId, servicoId, profissionalId, diaDaSemana, hora, intervaloSemanas, dataInicio } = parsed.data;

  const servico = await prisma.servico.findUnique({ where: { id: servicoId } });
  if (!servico) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  const serie = await prisma.serieRecorrente.create({
    data: {
      clienteId,
      servicoId,
      profissionalId,
      diaDaSemana,
      hora,
      intervaloSemanas,
      dataInicio: dateOnlyToDate(dataInicio),
    },
  });

  const { criadas } = await gerarOcorrenciasSerie(serie.id);
  return NextResponse.json({ serie, criadas }, { status: 201 });
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const agora = new Date();
  const series = await prisma.serieRecorrente.findMany({
    where: { estado: { not: "cancelada" } },
    include: {
      cliente: { select: { id: true, nome: true, telefone: true } },
      servico: { select: { id: true, nome: true, duracaoMin: true, precoCents: true } },
      profissional: { select: { id: true, nome: true } },
      agendamentos: {
        where: { dataHora: { gte: agora }, status: "agendado" },
        select: { id: true, dataHora: true, status: true },
        orderBy: { dataHora: "asc" },
        take: 100,
      },
    },
    orderBy: { criadaEm: "desc" },
  });
  return NextResponse.json(series);
}
