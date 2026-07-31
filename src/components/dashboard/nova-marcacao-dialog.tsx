"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { DIAS_SEMANA, toDateInputValue } from "@/lib/format";
import { diaDaSemana } from "@/lib/horarios";

type Cliente = { id: string; nome: string };
type Servico = { id: string; nome: string; duracaoMin: number };

export function NovaMarcacaoDialog({
  open,
  onClose,
  onCriada,
  clientes,
  servicos,
}: {
  open: boolean;
  onClose: () => void;
  onCriada: () => void;
  clientes: Cliente[];
  servicos: Servico[];
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Nova marcação">
      <NovaMarcacaoForm
        key={open ? "aberto" : "fechado"}
        onCriada={onCriada}
        onClose={onClose}
        clientes={clientes}
        servicos={servicos}
      />
    </Dialog>
  );
}

function NovaMarcacaoForm({
  onClose,
  onCriada,
  clientes,
  servicos,
}: {
  onClose: () => void;
  onCriada: () => void;
  clientes: Cliente[];
  servicos: Servico[];
}) {
  const [clienteId, setClienteId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [data, setData] = useState(toDateInputValue(new Date()));
  const [hora, setHora] = useState("10:00");
  const [notas, setNotas] = useState("");
  const [repetir, setRepetir] = useState(false);
  const [intervaloSemanas, setIntervaloSemanas] = useState(1);
  const [diaSerie, setDiaSerie] = useState(() => diaDaSemana(toDateInputValue(new Date())));
  const [aEnviar, setAEnviar] = useState(false);

  async function criar() {
    if (!clienteId || !servicoId || !data || !hora) {
      toast("Preenche todos os campos", "erro");
      return;
    }
    setAEnviar(true);
    try {
      const url = repetir ? "/api/series" : "/api/agendamentos/manual";
      const body = repetir
        ? { clienteId, servicoId, diaDaSemana: diaSerie, hora, intervaloSemanas, dataInicio: data }
        : { clienteId, servicoId, data, hora, notas };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "Erro ao criar marcação", "erro");
        return;
      }
      toast(repetir ? "Série recorrente criada" : "Marcação criada");
      onCriada();
      onClose();
    } catch {
      toast("Erro de ligação", "erro");
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <div className="space-y-4">
        <div>
          <label className="label" htmlFor="nm-cliente">
            Cliente
          </label>
          <select
            id="nm-cliente"
            className="input"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">Escolhe o cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="nm-servico">
            Serviço
          </label>
          <select
            id="nm-servico"
            className="input"
            value={servicoId}
            onChange={(e) => setServicoId(e.target.value)}
          >
            <option value="">Escolhe o serviço</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} ({s.duracaoMin} min)
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="nm-data">
              Dia
            </label>
            <input
              id="nm-data"
              type="date"
              className="input"
              value={data}
              onChange={(e) => {
                setData(e.target.value);
                if (e.target.value) setDiaSerie(diaDaSemana(e.target.value));
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="nm-hora">
              Hora
            </label>
            <input
              id="nm-hora"
              type="time"
              className="input"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="nm-notas">
            Notas (opcional)
          </label>
          <input
            id="nm-notas"
            className="input"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ex.: pediu para não usar máquina"
          />
        </div>
        <div className="flex items-center gap-2 rounded-sm border border-line bg-bg px-4 py-3">
          <input
            id="nm-repetir"
            type="checkbox"
            className="h-4 w-4"
            checked={repetir}
            onChange={(e) => setRepetir(e.target.checked)}
          />
          <label htmlFor="nm-repetir" className="text-sm font-medium text-ink">
            Marcação recorrente (reserva garantida)
          </label>
        </div>
        {repetir && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="nm-intervalo">
                Repetir a cada
              </label>
              <select
                id="nm-intervalo"
                className="input"
                value={intervaloSemanas}
                onChange={(e) => setIntervaloSemanas(Number(e.target.value))}
              >
                <option value={1}>1 semana</option>
                <option value={2}>2 semanas</option>
                <option value={3}>3 semanas</option>
                <option value={4}>4 semanas</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="nm-dia">
                Dia da semana
              </label>
              <select
                id="nm-dia"
                className="input"
                value={diaSerie}
                onChange={(e) => setDiaSerie(Number(e.target.value))}
              >
                {DIAS_SEMANA.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-gold" onClick={criar} disabled={aEnviar}>
            {aEnviar ? "A criar…" : "Criar marcação"}
          </button>
        </div>
      </div>
  );
}
