"use client";

import { useCallback, useEffect, useState } from "react";
import { toast, Toaster } from "@/components/ui/toaster";
import { messageFromResponse } from "@/lib/http";

type Configuracao = {
  nome: string; timezone: "Europe/Lisbon"; intervaloSlotsMin: number;
  antecedenciaMinHoras: number; horizonteDias: number;
  cancelamentoMinHoras: number; lembreteHoras: number;
};

const VAZIO: Configuracao = { nome: "Barbearia Nobre", timezone: "Europe/Lisbon", intervaloSlotsMin: 15, antecedenciaMinHoras: 2, horizonteDias: 90, cancelamentoMinHoras: 24, lembreteHoras: 24 };

export function ConfiguracaoView() {
  const [form, setForm] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [aEnviar, setAEnviar] = useState(false);
  const carregar = useCallback(async () => {
    try { const res = await fetch("/api/configuracao"); const json = await res.json(); if (!res.ok) throw new Error(); setForm(json); }
    catch { toast("Erro ao carregar configuração", "erro"); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  async function guardar(event: React.FormEvent) {
    event.preventDefault(); setAEnviar(true);
    try {
      const res = await fetch("/api/configuracao", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { toast(messageFromResponse(json, "Configuração inválida"), "erro"); return; }
      setForm(json); toast("Configuração guardada");
    } catch { toast("Erro de ligação", "erro"); }
    finally { setAEnviar(false); }
  }

  if (carregando) return <p className="text-muted">A carregar…</p>;
  const numberField = (key: keyof Configuracao, label: string, min: number, max: number) => (
    <div><label className="label" htmlFor={`cfg-${key}`}>{label}</label><input id={`cfg-${key}`} type="number" min={min} max={max} className="input" value={String(form[key])} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} /></div>
  );
  return <div>
    <div className="mb-8"><p className="eyebrow">Administração</p><h1 className="mt-2 font-display text-4xl font-semibold">Configuração</h1><p className="mt-2 max-w-xl text-sm text-muted">Estas regras controlam diretamente os horários apresentados na marcação online.</p></div>
    <form className="card card-pad max-w-3xl space-y-6" onSubmit={guardar}>
      <div><label className="label" htmlFor="cfg-nome">Nome da barbearia</label><input id="cfg-nome" className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
      <div className="grid gap-4 sm:grid-cols-2">{numberField("intervaloSlotsMin", "Intervalo dos horários (min)", 5, 60)}{numberField("antecedenciaMinHoras", "Antecedência mínima (horas)", 0, 168)}{numberField("horizonteDias", "Reservas até (dias)", 7, 730)}{numberField("cancelamentoMinHoras", "Cancelamento mínimo (horas)", 0, 168)}{numberField("lembreteHoras", "Lembrete antes (horas)", 1, 168)}<div><label className="label">Fuso horário</label><input className="input" value="Europe/Lisbon" disabled /></div></div>
      <button className="btn-gold" type="submit" disabled={aEnviar}>{aEnviar ? "A guardar…" : "Guardar configuração"}</button>
    </form><Toaster />
  </div>;
}
