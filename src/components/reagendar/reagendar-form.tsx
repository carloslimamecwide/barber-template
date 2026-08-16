"use client";

import { useState } from "react";
import { Scissors } from "lucide-react";
import { messageFromResponse } from "@/lib/http";

export function ReagendarForm({
  token,
  clienteNome,
  servicoNome,
  horaAtual,
  novaHora,
  expirada,
}: {
  token: string;
  clienteNome: string;
  servicoNome: string;
  horaAtual: string;
  novaHora: string;
  expirada: boolean;
}) {
  const [resultado, setResultado] = useState<"confirmado" | "recusado" | null>(null);
  const [erro, setErro] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  async function responder(decisao: "confirmar" | "recusar") {
    setAEnviar(true);
    setErro("");
    try {
      const res = await fetch(`/api/agendamentos/${token}/resposta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisao }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErro(messageFromResponse(json, "Ocorreu um erro"));
        return;
      }
      setResultado(json.resultado);
    } catch {
      setErro("Erro de ligação");
    } finally {
      setAEnviar(false);
    }
  }

  if (expirada) {
    return (
      <p className="card card-pad text-center text-sm text-danger">
        Esta proposta expirou. Contacta a barbearia.
      </p>
    );
  }

  if (resultado === "confirmado") {
    return (
      <div className="card card-pad text-center">
        <p className="eyebrow mb-3">Confirmado</p>
        <h2 className="font-display text-3xl font-semibold text-gold">
          Ficamos com o novo horário
        </h2>
        <p className="mt-4 text-sm text-muted">Até breve, {clienteNome.split(" ")[0]}!</p>
      </div>
    );
  }

  if (resultado === "recusado") {
    return (
      <div className="card card-pad text-center">
        <p className="eyebrow mb-3">Recusado</p>
        <h2 className="font-display text-3xl font-semibold text-ink">
          Mantemos o teu horário
        </h2>
        <p className="mt-4 text-sm text-muted">
          Continuas com a marcação às <span className="text-gold">{horaAtual}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="card card-pad">
      <p className="text-sm text-muted">
        Olá <span className="font-semibold text-ink">{clienteNome}</span>, temos uma
        sugestão para o teu serviço <span className="text-gold">{servicoNome}</span>:
      </p>

      <div className="mt-6 grid gap-3">
        <div className="rounded-sm border border-line bg-bg px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-muted">Horário atual</p>
          <p className="mt-1 text-lg font-semibold text-muted line-through">{horaAtual}</p>
        </div>
        <div className="rounded-sm border border-gold/40 bg-gold/5 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-gold">Horário proposto</p>
          <p className="mt-1 text-lg font-semibold text-gold">{novaHora}</p>
        </div>
      </div>

      {erro && (
        <p className="mt-5 rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button className="btn-gold flex-1" onClick={() => responder("confirmar")} disabled={aEnviar}>
          {aEnviar ? "A guardar…" : "Confirmar novo horário"}
        </button>
        <button className="btn-outline flex-1" onClick={() => responder("recusar")} disabled={aEnviar}>
          Manter atual
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        Se não responderes, mantém-se o horário atual.
      </p>
    </div>
  );
}

export function ReagendarShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Scissors className="mx-auto h-8 w-8 text-gold" />
          <h1 className="mt-4 font-display text-3xl font-semibold text-gold">
            Reagendar
          </h1>
          <p className="mt-1 text-sm text-muted">Barbearia Nobre</p>
        </div>
        {children}
      </div>
    </div>
  );
}
