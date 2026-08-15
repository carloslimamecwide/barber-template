import { notFound } from "next/navigation";
import { ReagendarShell } from "@/components/reagendar/reagendar-form";
import { GestaoMarcacao } from "@/components/reagendar/gestao-marcacao";
import { prisma } from "@/lib/prisma";

export default async function MarcacaoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const agendamento = await prisma.agendamento.findUnique({
    where: { tokenGestao: token },
    include: { cliente: true, servico: true, profissional: true },
  });
  if (!agendamento || (agendamento.tokenGestaoExpiraEm && agendamento.tokenGestaoExpiraEm < new Date())) notFound();
  return <ReagendarShell><GestaoMarcacao token={token} agendamento={{ ...agendamento, dataHora: agendamento.dataHora.toISOString() }} /></ReagendarShell>;
}
