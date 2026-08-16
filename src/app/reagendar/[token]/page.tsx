import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ReagendarForm, ReagendarShell } from "@/components/reagendar/reagendar-form";

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
  return prisma.agendamento.findUnique({
    where: { tokenProposta: token },
    include: { cliente: true, servico: true },
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

  if (!agendamento || !agendamento.novaDataHoraProposta) {
    return (
      <ReagendarShell>
        <p className="card card-pad text-center text-sm text-muted">
          Link inválido ou proposta já resolvida.
        </p>
      </ReagendarShell>
    );
  }

  if (agendamento.propostaStatus === "confirmada") {
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
              {formatarData(agendamento.dataHora)}
            </span>
            .
          </p>
        </div>
      </ReagendarShell>
    );
  }

  if (agendamento.propostaStatus === "recusada") {
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
              {formatarData(agendamento.dataHora)}
            </span>
            .
          </p>
        </div>
      </ReagendarShell>
    );
  }

  const expirada =
    agendamento.propostaExpiraEm !== null &&
    agendamento.propostaExpiraEm < new Date();

  return (
    <ReagendarShell>
      <ReagendarForm
        token={token}
        clienteNome={agendamento.cliente.nome}
        servicoNome={agendamento.servico.nome}
        horaAtual={formatarData(agendamento.dataHora)}
        novaHora={formatarData(agendamento.novaDataHoraProposta)}
        expirada={expirada}
      />
    </ReagendarShell>
  );
}
