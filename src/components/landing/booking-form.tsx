"use client";

import { useMemo, useState } from "react";
import { toast } from "@/components/ui/toaster";
import { Select } from "@/components/ui/select";
import { toDateInputValue } from "@/lib/format";

type Servico = {
  id: string;
  nome: string;
  precoCents: number;
  duracaoMin: number;
};

type HorarioInfo = { aberto: boolean };
type Profissional = { id: string; nome: string };

export function BookingForm({ servicos }: { servicos: Servico[] }) {
  const [servicoId, setServicoId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [horario, setHorario] = useState<HorarioInfo>({ aberto: true });
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [confirmado, setConfirmado] = useState<{
    nome: string;
    servico: string;
    dataHora: Date;
    precoCents: number;
  } | null>(null);

  const hoje = useMemo(() => toDateInputValue(new Date()), []);
  const servicoEscolhido = servicos.find((s) => s.id === servicoId);
  const preco = servicoEscolhido ? servicoEscolhido.precoCents / 100 : 0;

  async function carregarSlots(d: string, profissionalSelecionado = profissionalId) {
    if (!servicoId || !d) return;
    setCarregandoSlots(true);
    setHora("");
    try {
      const params = new URLSearchParams({ data: d, servicoId });
      if (profissionalSelecionado) params.set("profissionalId", profissionalSelecionado);
      const res = await fetch(`/api/agendamentos/disponiveis?${params.toString()}`);
      const json = await res.json();
      setSlots(json.slots ?? []);
      setHorario(json.horario ?? { aberto: true });
      setProfissionais(json.profissionais ?? []);
    } catch {
      toast("Erro ao carregar as horas disponíveis", "erro");
      setSlots([]);
    } finally {
      setCarregandoSlots(false);
    }
  }

  async function submeter() {
    if (!servicoId || !data || !hora || !nome || !telefone || !email) {
      toast("Preenche todos os campos", "erro");
      return;
    }
    setAEnviar(true);
    try {
      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicoId,
          profissionalId: profissionalId || undefined,
          data,
          hora,
          cliente: { nome, telefone, email },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "Não foi possível marcar", "erro");
        if (res.status === 409) {
          await carregarSlots(data);
        }
        return;
      }
      setConfirmado({
        nome,
        servico: servicoEscolhido?.nome ?? "",
        dataHora: json.dataHora,
        precoCents: servicoEscolhido?.precoCents ?? 0,
      });
      toast("Marcação confirmada! Enviámos o email.");
      setServicoId("");
      setProfissionalId("");
      setData("");
      setHora("");
      setSlots([]);
      setNome("");
      setTelefone("");
      setEmail("");
    } catch {
      toast("Erro de ligação", "erro");
    } finally {
      setAEnviar(false);
    }
  }

  if (confirmado) {
    const dataHora = new Intl.DateTimeFormat("pt-PT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(confirmado.dataHora));
    return (
      <div className="card card-pad text-center">
        <p className="eyebrow mb-3">Marcação confirmada</p>
        <h3 className="font-display text-3xl font-semibold text-gold">
          Até já, {confirmado.nome.split(" ")[0]}!
        </h3>
        <div className="mx-auto mt-6 max-w-xs space-y-2 text-sm text-ink">
          <p>
            <span className="text-muted">Serviço:</span> {confirmado.servico}
          </p>
          <p>
            <span className="text-muted">Quando:</span> {dataHora}
          </p>
          <p>
            <span className="text-muted">Preço:</span>{" "}
            {confirmado.precoCents / 100} €
          </p>
        </div>
        <p className="mt-6 text-sm text-muted">
          Enviámos a confirmação para o teu email. Chega 5 minutos antes.
        </p>
        <button className="btn-outline mt-6" onClick={() => setConfirmado(null)}>
          Nova marcação
        </button>
      </div>
    );
  }

  return (
    <div className="card card-pad">
      <div className="mb-6 space-y-5">
        <Select
          label="Serviço"
          id="bs-servico"
          value={servicoId}
          onChange={(valor) => {
            setServicoId(valor);
            setSlots([]);
            setHora("");
            if (valor && data) carregarSlots(data);
          }}
        >
          <option value="">Escolhe um serviço</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} — {(s.precoCents / 100).toFixed(2).replace(".", ",")} €
            </option>
          ))}
        </Select>

        {profissionais.length > 0 && (
          <Select
            label="Profissional"
            id="bs-profissional"
            value={profissionalId}
            onChange={(valor) => {
              setProfissionalId(valor);
              setSlots([]);
              setHora("");
              if (data && servicoId) carregarSlots(data, valor);
            }}
          >
            <option value="">Qualquer profissional</option>
            {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        )}

        <div>
          <label className="label" htmlFor="bs-data">
            Dia
          </label>
          <input
            id="bs-data"
            type="date"
            className="input"
            min={hoje}
            value={data}
            onChange={(e) => {
              const valor = e.target.value;
              setData(valor);
              setHora("");
              if (valor && servicoId) carregarSlots(valor);
            }}
          />
        </div>

        {data && servicoId && !carregandoSlots && (
          <div>
            <label className="label">Horas disponíveis</label>
            {!horario.aberto ? (
              <p className="rounded-sm border border-line bg-bg px-4 py-3 text-sm text-muted">
                A barbearia está fechada neste dia.
              </p>
            ) : slots.length === 0 ? (
              <p className="rounded-sm border border-line bg-bg px-4 py-3 text-sm text-muted">
                Sem horários livres neste dia. Tenta outro.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setHora(s)}
                    className={`rounded-sm border px-2 py-2 text-sm transition-colors ${
                      hora === s
                        ? "border-gold bg-gold text-bg font-bold"
                        : "border-line2 text-ink hover:border-gold hover:text-gold"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {carregandoSlots && (
          <p className="text-sm text-muted">A carregar horas…</p>
        )}

        {hora && (
          <div className="animate-fade space-y-5">
            <div>
              <label className="label" htmlFor="bs-nome">
                Nome
              </label>
              <input
                id="bs-nome"
                className="input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="O teu nome"
              />
            </div>
            <div>
              <label className="label" htmlFor="bs-telefone">
                Telefone
              </label>
              <input
                id="bs-telefone"
                className="input"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="9xx xxx xxx"
                inputMode="tel"
              />
            </div>
            <div>
              <label className="label" htmlFor="bs-email">
                Email
              </label>
              <input
                id="bs-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
              />
            </div>
          </div>
        )}
      </div>

      {hora && (
        <button className="btn-gold w-full" onClick={submeter} disabled={aEnviar}>
          {aEnviar
            ? "A confirmar…"
            : `Confirmar ${servicoEscolhido?.nome ?? ""} — ${preco.toFixed(2).replace(".", ",")} €`}
        </button>
      )}
    </div>
  );
}
