import { notFound } from "next/navigation";
import { ReagendarShell } from "@/components/reagendar/reagendar-form";
import { GestaoMarcacao } from "@/components/reagendar/gestao-marcacao";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

async function carregar(token: string) {
  try {
    return await prisma.agendamento.findUnique({
      where: { tokenGestaoHash: hashToken(token) },
      include: { cliente: true, servico: true, profissional: true },
    });
  } catch (error) {
    console.error("Erro ao carregar marcação:", error);
    return null;
  }
}

export default async function MarcacaoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const agendamento = await carregar(token);
  if (!agendamento || !agendamento.tokenGestaoExpiraEm || agendamento.tokenGestaoExpiraEm < new Date()) notFound();
  return <ReagendarShell><GestaoMarcacao token={token} agendamento={{ ...agendamento, dataHora: agendamento.dataHora.toISOString() }} /></ReagendarShell>;
}
