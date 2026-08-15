import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { combineDateAndTime } from "@/lib/horarios";
import { toDateInputValue } from "@/lib/format";
import { slotLivre, obterHorarioDoDia } from "@/lib/disponibilidade";
import { agendamentoPublicoSchema } from "@/lib/validations";
import { enviarEmailConfirmacao } from "@/lib/email";
import { randomUUID } from "node:crypto";

export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data") ?? toDateInputValue(new Date());
  const profissionalId = searchParams.get("profissionalId") || undefined;
  const agendamentos = await prisma.agendamento.findMany({
    where: {
      dataHora: {
        gte: combineDateAndTime(data, "00:00"),
        lte: combineDateAndTime(data, "23:59"),
      },
      ...(profissionalId ? { profissionalId } : {}),
    },
    include: { cliente: true, servico: true, profissional: true, serie: { select: { id: true } } },
    orderBy: { dataHora: "asc" },
  });
  return NextResponse.json(agendamentos);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = agendamentoPublicoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { servicoId, profissionalId, data, hora, cliente } = parsed.data;

  const servico = await prisma.servico.findUnique({ where: { id: servicoId } });
  if (!servico || !servico.ativo) {
    return NextResponse.json(
      { error: "Serviço não encontrado" },
      { status: 404 },
    );
  }

  const horario = await obterHorarioDoDia(data);
  if (!horario.aberto) {
    return NextResponse.json(
      { error: "A barbearia está fechada neste dia" },
      { status: 400 },
    );
  }

  const profissionais = await prisma.profissional.findMany({ where: { ativo: true }, orderBy: [{ ordem: "asc" }, { nome: "asc" }] });
  const candidatos = profissionalId
    ? profissionais.filter((p) => p.id === profissionalId)
    : profissionais;
  if (profissionalId && candidatos.length === 0) {
    return NextResponse.json({ error: "Profissional não encontrado" }, { status: 404 });
  }
  let profissionalEscolhido: (typeof candidatos)[number] | undefined = candidatos[0];
  let slotDisponivel = false;
  if (candidatos.length > 0) {
    profissionalEscolhido = undefined;
    for (const candidato of candidatos) {
      if (await slotLivre(data, hora, servico.duracaoMin, undefined, candidato.id)) {
        profissionalEscolhido = candidato;
        slotDisponivel = true;
        break;
      }
    }
  } else {
    slotDisponivel = await slotLivre(data, hora, servico.duracaoMin);
  }
  if (!slotDisponivel) {
    return NextResponse.json(
      { error: "Esta hora já não está disponível" },
      { status: 409 },
    );
  }

  let clienteReg = await prisma.cliente.findFirst({
    where: { email: cliente.email },
  });
  if (!clienteReg) {
    clienteReg = await prisma.cliente.create({
      data: {
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email,
      },
    });
  } else {
    clienteReg = await prisma.cliente.update({
      where: { id: clienteReg.id },
      data: { nome: cliente.nome, telefone: cliente.telefone },
    });
  }

  const agendamento = await prisma.agendamento.create({
    data: {
      clienteId: clienteReg.id,
      servicoId: servico.id,
      profissionalId: profissionalEscolhido?.id,
      dataHora: combineDateAndTime(data, hora),
      status: "agendado",
      precoCobrado: servico.precoCents,
      tokenGestao: randomUUID(),
      tokenGestaoExpiraEm: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
    },
  });

  await enviarEmailConfirmacao({
    email: cliente.email,
    nome: cliente.nome,
    servico: servico.nome,
    dataHora: agendamento.dataHora,
    precoCents: servico.precoCents,
    tokenGestao: agendamento.tokenGestao!,
  }).catch((e) => {
    console.error("Falha ao enviar email de confirmação:", e);
  });

  return NextResponse.json(agendamento, { status: 201 });
}
