"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { toast, Toaster } from "@/components/ui/toaster";
import { useConfirm } from "@/hooks/use-confirm";
import { NovaMarcacaoDialog } from "@/components/dashboard/nova-marcacao-dialog";
import { formatHora, formatPreco, toDateInputValue } from "@/lib/format";

type Agendamento = {
  id: string;
  dataHora: string;
  status: "agendado" | "concluido" | "cancelado" | "faltou";
  precoCobrado: number;
  nota?: string;
  propostaStatus?: string | null;
  novaDataHoraProposta?: string | null;
  cliente: { id: string; nome: string; telefone: string };
  servico: { id: string; nome: string; duracaoMin: number };
  profissional?: { id: string; nome: string } | null;
  serie?: { id: string } | null;
};

type Cliente = { id: string; nome: string };
type Servico = { id: string; nome: string; duracaoMin: number };
type Profissional = { id: string; nome: string; ativo: boolean };

const STATUS: Record<string, { label: string; classe: string }> = {
  agendado: { label: "Agendado", classe: "badge-gold" },
  concluido: { label: "Concluído", classe: "badge-green" },
  cancelado: { label: "Cancelado", classe: "badge-gray" },
  faltou: { label: "Faltou", classe: "badge-red" },
};

function deslocarDia(data: string, delta: number): string {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toDateInputValue(d);
}

export function AgendaView() {
  const [data, setData] = useState(toDateInputValue(new Date()));
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalId, setProfissionalId] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [nova, setNova] = useState(false);
  const { confirm, dialog } = useConfirm();

  const [alvo, setAlvo] = useState<Agendamento | null>(null);
  const [modalHora, setModalHora] = useState<{
    tipo: "editar" | "sugerir";
  } | null>(null);
  const [horaData, setHoraData] = useState("");
  const [horaHora, setHoraHora] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  const carregar = useCallback(async (d: string) => {
    try {
      const params = new URLSearchParams({ data: d });
      if (profissionalId) params.set("profissionalId", profissionalId);
      const res = await fetch(`/api/agendamentos?${params.toString()}`);
      const json = await res.json();
      setAgendamentos(json);
    } catch {
      toast("Erro ao carregar a agenda", "erro");
    } finally {
      setCarregando(false);
    }
  }, [profissionalId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar(data);
  }, [data, carregar]);

  useEffect(() => {
    Promise.all([
      fetch("/api/clientes").then((r) => r.json()),
      fetch("/api/servicos").then((r) => r.json()),
      fetch("/api/profissionais").then((r) => r.json()),
    ])
      .then(([c, s, p]) => {
        setClientes(c);
        setServicos(s);
        setProfissionais(p);
      })
      .catch(() => {
        toast("Erro ao carregar dados", "erro");
      });
  }, []);

  async function mudarStatus(a: Agendamento, status: string) {
    const res = await fetch(`/api/agendamentos/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast(`Marcação marcada como "${status}"`);
      carregar(data);
    } else {
      toast("Não foi possível atualizar", "erro");
    }
  }

  async function apagar(a: Agendamento) {
    const confirmado = await confirm({
      title: "Apagar marcação?",
      description: `Apagar a marcação de ${a.cliente.nome}?`,
      confirmText: "Apagar",
      variant: "danger",
    });
    if (!confirmado) return;
    const res = await fetch(`/api/agendamentos/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Marcação apagada");
      carregar(data);
    } else {
      toast("Não foi possível apagar", "erro");
    }
  }

  function abrirHora(a: Agendamento, tipo: "editar" | "sugerir") {
    setAlvo(a);
    const d = new Date(a.dataHora);
    setHoraData(toDateInputValue(d));
    setHoraHora(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    setModalHora({ tipo });
  }

  async function guardarHora() {
    if (!alvo || !horaData || !horaHora) return;
    setAEnviar(true);
    try {
      const url =
        modalHora?.tipo === "sugerir"
          ? `/api/agendamentos/${alvo.id}/sugerir`
          : `/api/agendamentos/${alvo.id}`;
      const res = await fetch(url, {
        method: modalHora?.tipo === "sugerir" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: horaData, hora: horaHora }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "Não foi possível guardar", "erro");
        return;
      }
      toast(
        modalHora?.tipo === "sugerir"
          ? "Email enviado ao cliente"
          : "Hora atualizada",
      );
      setModalHora(null);
      setAlvo(null);
      carregar(data);
    } catch {
      toast("Erro de ligação", "erro");
    } finally {
      setAEnviar(false);
    }
  }

  const faturacao = agendamentos
    .filter((a) => a.status === "concluido")
    .reduce((s, a) => s + a.precoCobrado, 0);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Agenda</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">
            Marcações do dia
          </h1>
        </div>
        <button className="btn-gold" onClick={() => setNova(true)}>
          <Plus className="h-4 w-4" />
          Nova marcação
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button className="btn-outline !px-3" onClick={() => setData((d) => deslocarDia(d, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <input
          type="date"
          className="input !w-auto"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
        <button className="btn-outline !px-3" onClick={() => setData((d) => deslocarDia(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </button>
        {data !== toDateInputValue(new Date()) && (
          <button className="btn-outline" onClick={() => setData(toDateInputValue(new Date()))}>
            Hoje
          </button>
        )}
        {profissionais.length > 0 && (
          <Select
            value={profissionalId}
            onChange={setProfissionalId}
            className="!w-auto"
            aria-label="Filtrar por profissional"
          >
            <option value="">Todos os profissionais</option>
            {profissionais.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        )}
        <div className="ml-auto flex gap-2 text-sm">
          <span className="badge-gold">
            {agendamentos.filter((a) => a.status === "agendado").length} por atender
          </span>
          <span className="badge-green">Faturado {formatPreco(faturacao)}</span>
        </div>
      </div>

      {carregando ? (
        <p className="text-muted">A carregar…</p>
      ) : agendamentos.length === 0 ? (
        <div className="card card-pad text-center text-muted">
          Sem marcações neste dia.
        </div>
      ) : (
        <ul className="space-y-3">
          {agendamentos.map((a) => {
            const st = STATUS[a.status] ?? STATUS.agendado;
            return (
              <li key={a.id} className="card flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
                <div className="w-16 shrink-0 font-display text-2xl font-semibold text-gold">
                  {formatHora(a.dataHora)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {a.cliente.nome}
                    {a.serie && (
                      <span className="ml-2 rounded-full border border-gold px-2 py-0.5 text-xs font-normal text-gold">
                        Recorrente
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {a.cliente.telefone} · {a.servico.nome}{a.profissional ? ` · ${a.profissional.nome}` : ""}
                  </p>
                  {a.novaDataHoraProposta && (
                    <p className="mt-0.5 text-xs text-gold-soft">
                      Proposta de novo horário pendente
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={st.classe}>{st.label}</span>
                  <span className="text-sm text-muted">{formatPreco(a.precoCobrado)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    className="btn-outline !py-1.5 !px-3 !text-xs"
                    href={`https://wa.me/${a.cliente.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${a.cliente.nome}, lembramos a tua marcação de ${a.servico.nome}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                  <Select
                    value={a.status}
                    onChange={(valor) => mudarStatus(a, valor)}
                    className="!w-auto"
                  >
                    <option value="agendado">Agendado</option>
                    <option value="concluido">Concluir</option>
                    <option value="cancelado">Cancelar</option>
                    <option value="faltou">Faltou</option>
                  </Select>
                  <button className="btn-outline !py-1.5 !px-3 !text-xs" onClick={() => abrirHora(a, "editar")}>
                    Editar hora
                  </button>
                  <button className="btn-outline !py-1.5 !px-3 !text-xs" onClick={() => abrirHora(a, "sugerir")}>
                    Sugerir por email
                  </button>
                  <button className="btn-danger !py-1.5 !px-3 !text-xs" onClick={() => apagar(a)}>
                    Apagar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NovaMarcacaoDialog
        open={nova}
        onClose={() => setNova(false)}
        onCriada={() => carregar(data)}
        clientes={clientes}
        servicos={servicos}
        profissionais={profissionais}
      />

      <Dialog
        open={modalHora !== null}
        onClose={() => {
          setModalHora(null);
          setAlvo(null);
        }}
        title={modalHora?.tipo === "sugerir" ? "Sugerir nova hora" : "Editar hora"}
      >
        <div className="space-y-4">
          {alvo && (
            <p className="rounded-sm border border-line bg-bg px-4 py-3 text-sm text-muted">
              <span className="text-ink">{alvo.cliente.nome}</span> ·{" "}
              {alvo.servico.nome} · atualmente às{" "}
              <span className="text-gold">{formatHora(alvo.dataHora)}</span>
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="hh-data">
                Nova data
              </label>
              <input
                id="hh-data"
                type="date"
                className="input"
                value={horaData}
                onChange={(e) => setHoraData(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="hh-hora">
                Nova hora
              </label>
              <input
                id="hh-hora"
                type="time"
                className="input"
                value={horaHora}
                onChange={(e) => setHoraHora(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted">
            {modalHora?.tipo === "sugerir"
              ? "O cliente recebe um email com um link para confirmar ou recusar."
              : "A hora é alterada de imediato, sem email."}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              className="btn-outline"
              onClick={() => {
                setModalHora(null);
                setAlvo(null);
              }}
            >
              Cancelar
            </button>
            <button className="btn-gold" onClick={guardarHora} disabled={aEnviar}>
              {aEnviar
                ? "A guardar…"
                : modalHora?.tipo === "sugerir"
                  ? "Enviar email"
                  : "Guardar"}
            </button>
          </div>
        </div>
      </Dialog>

      {dialog}
      <Toaster />
    </div>
  );
}
