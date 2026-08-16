import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ReagendarForm, ReagendarShell } from "@/components/reagendar/reagendar-form";
import { hashToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reagendar — Barbearia Nobre",
};

function formatarData(d: Date): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

async function getAgendamento(token: string) {
  return prisma.propostaReagendamento.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { agendamento: { include: { cliente: true, servico: true } } },
  });
}

export default async function ReagendarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let agendamento: Awaited<ReturnType<typeof getAgendamento>> | null = null;
  try {
    agendamento = await getAgendamento(token);
  } catch (error) {
    console.error("Erro ao carregar proposta de reagendamento:", error);
    agendamento = null;
  }

  if (!agendamento) {
    return (
      <ReagendarShell>
        <p className="card card-pad text-center text-sm text-muted">
          Link inválido ou proposta já resolvida.
        </p>
      </ReagendarShell>
    );
  }

  if (agendamento.status === "confirmada") {
    return (
      <ReagendarShell>
        <div className="card card-pad text-center">
          <p className="eyebrow mb-3">Confirmado</p>
          <h2 className="font-display text-3xl font-semibold text-gold">
            Já confirmaste
          </h2>
          <p className="mt-4 text-sm text-muted">
            A tua marcação está agora para{" "}
            <span className="text-gold">
              {formatarData(agendamento.novaDataHora)}
            </span>
            .
          </p>
        </div>
      </ReagendarShell>
    );
  }

  if (agendamento.status === "recusada") {
    return (
      <ReagendarShell>
        <div className="card card-pad text-center">
          <p className="eyebrow mb-3">Recusado</p>
          <h2 className="font-display text-3xl font-semibold text-ink">
            Já recusaste
          </h2>
          <p className="mt-4 text-sm text-muted">
            Mantiveste o horário{" "}
            <span className="text-gold">
              {formatarData(agendamento.dataHoraAtual)}
            </span>
            .
          </p>
        </div>
      </ReagendarShell>
    );
  }

  const expirada =
    agendamento.expiraEm < new Date() || agendamento.status === "expirada";

  return (
    <ReagendarShell>
      <ReagendarForm
        token={token}
        clienteNome={agendamento.agendamento.cliente.nome}
        servicoNome={agendamento.agendamento.servico.nome}
        horaAtual={formatarData(agendamento.dataHoraAtual)}
        novaHora={formatarData(agendamento.novaDataHora)}
        expirada={expirada}
      />
    </ReagendarShell>
  );
}
