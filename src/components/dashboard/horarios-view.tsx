"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast, Toaster } from "@/components/ui/toaster";
import { DIAS_SEMANA, formatData, toDateInputValue } from "@/lib/format";

type Horario = {
  id: string;
  diaDaSemana: number;
  aberto: boolean;
  abertura: string | null;
  fecho: string | null;
  pausaInicio: string | null;
  pausaFim: string | null;
};

type DiaFechado = {
  id: string;
  data: string;
  motivo: string | null;
};

const DIAS = [...DIAS_SEMANA].sort((a, b) => (a.valor === 0 ? 1 : a.valor - b.valor));

export function HorariosView() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [dias, setDias] = useState<DiaFechado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novaData, setNovaData] = useState("");
  const [novoMotivo, setNovoMotivo] = useState("");

  const carregar = useCallback(async () => {
    try {
      const [h, d] = await Promise.all([
        fetch("/api/horarios").then((r) => r.json()),
        fetch("/api/dias-fechados").then((r) => r.json()),
      ]);
      setHorarios(h);
      setDias(d);
    } catch {
      toast("Erro ao carregar horários", "erro");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  function atualizar(diaDaSemana: number, patch: Partial<Horario>) {
    setHorarios((prev) =>
      prev.map((h) => (h.diaDaSemana === diaDaSemana ? { ...h, ...patch } : h)),
    );
  }

  async function guardar() {
    const body = horarios.map((h) => ({
      diaDaSemana: h.diaDaSemana,
      aberto: h.aberto,
      abertura: h.aberto ? h.abertura : null,
      fecho: h.aberto ? h.fecho : null,
      pausaInicio: h.aberto ? h.pausaInicio : null,
      pausaFim: h.aberto ? h.pausaFim : null,
    }));
    try {
      const res = await fetch("/api/horarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast("Erro ao guardar horários", "erro");
        return;
      }
      toast("Horário guardado");
    } catch {
      toast("Erro de ligação", "erro");
    }
  }

  async function adicionarDiaFechado() {
    if (!novaData) {
      toast("Escolhe uma data", "erro");
      return;
    }
    try {
      const res = await fetch("/api/dias-fechados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: novaData, motivo: novoMotivo }),
      });
      if (!res.ok) {
        toast("Erro ao adicionar dia fechado", "erro");
        return;
      }
      toast("Dia fechado adicionado");
      setNovaData("");
      setNovoMotivo("");
      carregar();
    } catch {
      toast("Erro de ligação", "erro");
    }
  }

  async function removerDiaFechado(id: string) {
    const res = await fetch(`/api/dias-fechados/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Dia removido");
      carregar();
    } else {
      toast("Não foi possível remover", "erro");
    }
  }

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow">Horários</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">
          Funcionamento
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          Define os dias e horas de abertura. Os dias fechados sobrepõem-se ao
          horário semanal.
        </p>
      </div>

      {carregando ? (
        <p className="text-muted">A carregar…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="card divide-y divide-line overflow-hidden">
            {DIAS.map((dia) => {
              const h = horarios.find((x) => x.diaDaSemana === dia.valor);
              const aberto = h?.aberto ?? false;
              return (
                <div key={dia.valor} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="flex min-w-40 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={aberto}
                      onChange={(e) =>
                        atualizar(dia.valor, {
                          aberto: e.target.checked,
                          ...(e.target.checked
                            ? { abertura: h?.abertura ?? "09:00", fecho: h?.fecho ?? "19:00" }
                            : {}),
                        })
                      }
                      className="h-4 w-4 accent-[#c9a24b]"
                    />
                    <span className="font-semibold text-ink">{dia.nome}</span>
                  </div>
                  {aberto ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <input
                        type="time"
                        className="input !w-auto !py-1.5"
                        value={h?.abertura ?? "09:00"}
                        onChange={(e) => atualizar(dia.valor, { abertura: e.target.value })}
                      />
                      <span className="text-muted">até</span>
                      <input
                        type="time"
                        className="input !w-auto !py-1.5"
                        value={h?.fecho ?? "19:00"}
                        onChange={(e) => atualizar(dia.valor, { fecho: e.target.value })}
                      />
                      <span className="ml-2 text-muted">pausa</span>
                      <input type="time" className="input !w-auto !py-1.5" value={h?.pausaInicio ?? ""} aria-label={`Início da pausa de ${dia.nome}`} onChange={(e) => atualizar(dia.valor, { pausaInicio: e.target.value || null })} />
                      <span className="text-muted">até</span>
                      <input type="time" className="input !w-auto !py-1.5" value={h?.pausaFim ?? ""} aria-label={`Fim da pausa de ${dia.nome}`} onChange={(e) => atualizar(dia.valor, { pausaFim: e.target.value || null })} />
                    </div>
                  ) : (
                    <span className="text-sm text-danger">Fechado</span>
                  )}
                </div>
              );
            })}
            <div className="px-5 py-4">
              <button className="btn-gold" onClick={guardar}>
                Guardar horário
              </button>
            </div>
          </div>

          <div className="card card-pad">
            <h2 className="font-display text-2xl font-semibold text-gold">
              Dias fechados
            </h2>
            <p className="mt-1 text-sm text-muted">
              Feriados e férias — sem marcações nestes dias.
            </p>

            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-[1fr_1.4fr] gap-2">
                <input
                  type="date"
                  className="input"
                  min={toDateInputValue(new Date())}
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                />
                <input
                  className="input"
                  value={novoMotivo}
                  onChange={(e) => setNovoMotivo(e.target.value)}
                  placeholder="Motivo (ex.: feriado)"
                />
              </div>
              <button className="btn-outline w-full" onClick={adicionarDiaFechado}>
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            </div>

            <ul className="mt-5 space-y-2">
              {dias.length === 0 && (
                <li className="text-sm text-muted">Sem dias fechados.</li>
              )}
              {dias.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-sm border border-line bg-bg px-4 py-2.5 text-sm"
                >
                  <span>
                    <span className="font-semibold text-ink">
                      {formatData(d.data)}
                    </span>
                    {d.motivo && (
                      <span className="ml-2 text-muted">{d.motivo}</span>
                    )}
                  </span>
                  <button
                    className="btn-ghost !p-1.5 hover:!text-danger"
                    onClick={() => removerDiaFechado(d.id)}
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
