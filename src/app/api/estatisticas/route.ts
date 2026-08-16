import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/format";
import { combineDateAndTime } from "@/lib/horarios";

export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const hoje = new Date();
  const mes = searchParams.get("mes") ?? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    return NextResponse.json({ error: "Mês inválido" }, { status: 422 });
  }
  const [ano, m] = mes.split("-").map(Number);
  const inicio = combineDateAndTime(`${ano}-${String(m).padStart(2, "0")}-01`, "00:00");
  const proximoMes = m === 12 ? `${ano + 1}-01-01` : `${ano}-${String(m + 1).padStart(2, "0")}-01`;
  const fim = new Date(combineDateAndTime(proximoMes, "00:00").getTime() - 1);

  const concluidos = await prisma.agendamento.findMany({
    where: { dataHora: { gte: inicio, lte: fim }, status: "concluido" },
    include: { servico: true, cliente: true },
  });

  const todosDoMes = await prisma.agendamento.count({
    where: { dataHora: { gte: inicio, lte: fim } },
  });

  const faturacao = concluidos.reduce((soma, a) => soma + a.precoCobrado, 0);

  const porServico = new Map<string, { nome: string; quantidade: number; total: number }>();
  for (const a of concluidos) {
    const atual = porServico.get(a.servicoId) ?? { nome: a.servico.nome, quantidade: 0, total: 0 };
    atual.quantidade += 1;
    atual.total += a.precoCobrado;
    porServico.set(a.servicoId, atual);
  }

  const porCliente = new Map<string, { nome: string; quantidade: number; total: number }>();
  for (const a of concluidos) {
    const atual = porCliente.get(a.clienteId) ?? { nome: a.cliente.nome, quantidade: 0, total: 0 };
    atual.quantidade += 1;
    atual.total += a.precoCobrado;
    porCliente.set(a.clienteId, atual);
  }

  const hojeStr = toDateInputValue(hoje);
  const proximos = await prisma.agendamento.count({
    where: {
      status: "agendado",
      dataHora: { gte: new Date() },
    },
  });

  return NextResponse.json({
    mes,
    faturacao,
    totalMarcacoes: todosDoMes,
    concluidos: concluidos.length,
    proximos,
    porServico: Array.from(porServico.values()).sort((a, b) => b.total - a.total),
    porCliente: Array.from(porCliente.values()).sort((a, b) => b.total - a.total),
    hoje: hojeStr,
  });
}
