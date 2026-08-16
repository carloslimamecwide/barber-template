"use client";

import { useState } from "react";
import { useConfirm } from "@/hooks/use-confirm";
import { formatDataHora } from "@/lib/format";

type Agendamento = {
  cliente: { nome: string };
  servico: { nome: string; duracaoMin: number };
  profissional: { nome: string } | null;
  dataHora: string;
  status: string;
};

export function GestaoMarcacao({ token, agendamento }: { token: string; agendamento: Agendamento }) {
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [resultado, setResultado] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const { confirm, dialog } = useConfirm();

  async function enviar(body: Record<string, string>) {
    setAEnviar(true);
    setResultado("");
    try {
      const res = await fetch(`/api/marcacoes/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      setResultado(res.ok ? (body.acao === "cancelar" ? "Marcação cancelada." : "Marcação reagendada com sucesso.") : json.error ?? "Não foi possível atualizar a marcação.");
    } catch {
      setResultado("Erro de ligação. Tenta novamente.");
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <div className="card card-pad">
      <p className="text-sm text-muted">Olá <span className="font-semibold text-ink">{agendamento.cliente.nome}</span></p>
      <h2 className="mt-2 font-display text-3xl font-semibold text-gold">Gerir marcação</h2>
      <div className="mt-5 space-y-2 text-sm"><p><span className="text-muted">Serviço:</span> {agendamento.servico.nome}</p><p><span className="text-muted">Quando:</span> {formatDataHora(agendamento.dataHora.toString())}</p>{agendamento.profissional && <p><span className="text-muted">Profissional:</span> {agendamento.profissional.nome}</p>}</div>
      {resultado && <p className="mt-5 rounded-sm border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold" role="status">{resultado}</p>}
      {agendamento.status === "agendado" && !resultado.includes("cancelada") && !resultado.includes("reagendada") && <>
        <div className="mt-6 grid grid-cols-2 gap-3"><div><label className="label" htmlFor="mg-data">Nova data</label><input id="mg-data" type="date" className="input" min={new Date().toISOString().slice(0, 10)} value={data} onChange={(e) => setData(e.target.value)} /></div><div><label className="label" htmlFor="mg-hora">Nova hora</label><input id="mg-hora" type="time" className="input" value={hora} onChange={(e) => setHora(e.target.value)} /></div></div>
        <button className="btn-gold mt-5 w-full" disabled={aEnviar || !data || !hora} onClick={() => enviar({ data, hora })}>{aEnviar ? "A guardar…" : "Reagendar"}</button>
        <button
          className="btn-danger mt-3 w-full"
          disabled={aEnviar}
          onClick={async () => {
            const confirmado = await confirm({
              title: "Cancelar marcação?",
              description: "Queres mesmo cancelar esta marcação?",
              confirmText: "Cancelar",
              variant: "danger",
            });
            if (confirmado) enviar({ acao: "cancelar" });
          }}
        >
          Cancelar marcação
        </button>
      </>}
      {dialog}
    </div>
  );
}
