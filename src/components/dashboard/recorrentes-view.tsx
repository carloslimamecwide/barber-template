"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Repeat } from "lucide-react";
import { toast, Toaster } from "@/components/ui/toaster";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/hooks/use-confirm";
import { DIAS_SEMANA, formatDataHora, nomeDiaSemana, toDateInputValue } from "@/lib/format";

type Serie = {
  id: string;
  diaDaSemana: number;
  hora: string;
  intervaloSemanas: number;
  dataInicio: string;
  estado: "ativa" | "cancelada";
  cliente: { id: string; nome: string; telefone: string };
  servico: { id: string; nome: string; duracaoMin: number; precoCents: number };
  profissional: { id: string; nome: string } | null;
  agendamentos: { id: string; dataHora: string; status: string }[];
  excecoes: { id: string; dataHora: string; motivo: string }[];
};

const ESTADO: Record<string, { label: string; classe: string }> = {
  ativa: { label: "Ativa", classe: "badge-green" },
};

function descricao(s: Serie): string {
  const dia = nomeDiaSemana(s.diaDaSemana);
  const freq =
    s.intervaloSemanas === 1
      ? "todas as semanas"
      : `a cada ${s.intervaloSemanas} semanas`;
  return `${dia} às ${s.hora} · ${freq}`;
}

export function RecorrentesView() {
  const [series, setSeries] = useState<Serie[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aEnviar, setAEnviar] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const [editar, setEditar] = useState<Serie | null>(null);
  const [detalhe, setDetalhe] = useState<Serie | null>(null);
  const [opcoes, setOpcoes] = useState<{ clientes: { id: string; nome: string; ativo: boolean }[]; servicos: { id: string; nome: string; ativo: boolean }[]; profissionais: { id: string; nome: string; ativo: boolean }[] }>({ clientes: [], servicos: [], profissionais: [] });
  const [form, setForm] = useState({ clienteId: "", servicoId: "", profissionalId: "", diaDaSemana: 1, hora: "09:00", intervaloSemanas: 1, dataInicio: "" });

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/series");
      const json = await res.json();
      if (!res.ok || !Array.isArray(json)) throw new Error("Resposta inválida");
      setSeries(json);
    } catch {
      toast("Erro ao carregar séries", "erro");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  async function acao(serieId: string, url: string, sucesso: string) {
    setAEnviar(serieId);
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "Não foi possível", "erro");
        return;
      }
      toast(sucesso);
      carregar();
    } catch {
      toast("Erro de ligação", "erro");
    } finally {
      setAEnviar(null);
    }
  }

  async function cancelar(s: Serie) {
    const confirmado = await confirm({
      title: "Cancelar série?",
      description: `Cancelar a série recorrente de ${s.cliente.nome}? As ocorrências futuras serão canceladas.`,
      confirmText: "Cancelar",
      variant: "danger",
    });
    if (!confirmado) return;
    acao(s.id, `/api/series/${s.id}`, "Série cancelada");
  }

  async function abrirEdicao(s: Serie) {
    setForm({
      clienteId: s.cliente.id, servicoId: s.servico.id,
      profissionalId: s.profissional?.id ?? "", diaDaSemana: s.diaDaSemana,
      hora: s.hora, intervaloSemanas: s.intervaloSemanas,
      dataInicio: toDateInputValue(new Date(s.dataInicio)),
    });
    setEditar(s);
    try {
      const responses = await Promise.all([fetch("/api/clientes"), fetch("/api/servicos"), fetch("/api/profissionais")]);
      if (responses.some((response) => !response.ok)) throw new Error();
      const [clientes, servicos, profissionais] = await Promise.all(responses.map((response) => response.json()));
      setOpcoes({ clientes, servicos, profissionais });
    } catch { toast("Não foi possível carregar as opções", "erro"); }
  }

  async function guardarEdicao() {
    if (!editar) return;
    setAEnviar(editar.id);
    try {
      const res = await fetch(`/api/series/${editar.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, profissionalId: form.profissionalId || undefined }) });
      const json = await res.json();
      if (!res.ok) { toast(json.error ?? "Não foi possível editar", "erro"); return; }
      toast(json.excecoes ? `Série atualizada com ${json.excecoes} conflito(s)` : "Série atualizada");
      setEditar(null);
      carregar();
    } catch { toast("Erro de ligação", "erro"); }
    finally { setAEnviar(null); }
  }

  async function tentarExcecao(serieId: string, exceptionId: string) {
    setAEnviar(serieId);
    try {
      const res = await fetch(`/api/series/${serieId}/excecoes/${exceptionId}`, { method: "POST" });
      const json = await res.json();
      toast(res.ok && json.resolvida ? "Ocorrência criada" : "O conflito ainda existe", res.ok && json.resolvida ? "sucesso" : "erro");
      carregar();
    } catch { toast("Erro de ligação", "erro"); }
    finally { setAEnviar(null); }
  }

  async function cancelarOcorrencia(serie: Serie, agendamentoId: string) {
    const confirmado = await confirm({ title: "Cancelar esta ocorrência?", description: "A série continuará ativa e as restantes ocorrências não serão alteradas.", confirmText: "Cancelar ocorrência", variant: "danger" });
    if (!confirmado) return;
    const res = await fetch(`/api/agendamentos/${agendamentoId}`, { method: "DELETE" });
    if (res.ok) { toast("Ocorrência cancelada"); setDetalhe(null); carregar(); } else toast("Não foi possível cancelar", "erro");
  }

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow">Recorrentes</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">
          Séries de marcações
        </h1>
      </div>

      {carregando ? (
        <p className="text-muted">A carregar…</p>
      ) : series.length === 0 ? (
        <div className="card card-pad text-center text-muted">
          Sem séries recorrentes. Cria uma em &quot;Nova marcação&quot; e ativa
          &quot;Marcação recorrente&quot;.
        </div>
      ) : (
        <ul className="space-y-3">
          {series.map((s) => {
            const st = ESTADO[s.estado] ?? ESTADO.ativa;
            const proxima = s.agendamentos[0];
            return (
              <li
                key={s.id}
                className="card flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    <Repeat className="h-4 w-4 text-gold" />
                    {s.cliente.nome}
                  </p>
                  <p className="text-sm text-muted">
                    {s.servico.nome} · {descricao(s)}{s.profissional ? ` · ${s.profissional.nome}` : " · qualquer profissional"}
                  </p>
                  {s.excecoes.length > 0 && (
                    <div className="mt-1 text-xs text-red-400">
                      <p>{s.excecoes.length} ocorrência(s) não criada(s); a série continua ativa.</p>
                      {s.excecoes.slice(0, 3).map((item) => <button key={item.id} className="mr-2 mt-1 underline" disabled={aEnviar === s.id} onClick={() => tentarExcecao(s.id, item.id)}>Tentar {formatDataHora(item.dataHora)}</button>)}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm">
                  {proxima ? (
                    <p className="text-gold">
                      Próxima: {formatDataHora(proxima.dataHora)}
                    </p>
                  ) : (
                    <p className="text-muted">Sem ocorrências futuras</p>
                  )}
                  <p className="text-muted">
                    {s.agendamentos.length} futuras
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={st.classe}>{st.label}</span>
                  <button className="btn-outline !py-1.5 !px-3 !text-xs" onClick={() => setDetalhe(s)}>Detalhes</button>
                  <button className="btn-outline !py-1.5 !px-3 !text-xs" onClick={() => abrirEdicao(s)}><Pencil className="h-3.5 w-3.5" />Editar</button>
                  <button
                    className="btn-danger !py-1.5 !px-3 !text-xs"
                    disabled={aEnviar === s.id}
                    onClick={() => cancelar(s)}
                  >
                    Cancelar série
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog}
      <Dialog open={editar !== null} onClose={() => setEditar(null)} title="Editar série recorrente">
        <div className="space-y-4">
          <Select label="Cliente" value={form.clienteId} onChange={(value) => setForm({ ...form, clienteId: value })}>{opcoes.clientes.filter((item) => item.ativo || item.id === form.clienteId).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select>
          <Select label="Serviço" value={form.servicoId} onChange={(value) => setForm({ ...form, servicoId: value })}>{opcoes.servicos.filter((item) => item.ativo || item.id === form.servicoId).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select>
          <Select label="Profissional" value={form.profissionalId} onChange={(value) => setForm({ ...form, profissionalId: value })}><option value="">Qualquer profissional</option>{opcoes.profissionais.filter((item) => item.ativo || item.id === form.profissionalId).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Dia da semana" value={form.diaDaSemana} onChange={(value) => setForm({ ...form, diaDaSemana: Number(value) })}>{DIAS_SEMANA.map((item) => <option key={item.valor} value={item.valor}>{item.nome}</option>)}</Select>
            <div><label className="label" htmlFor="serie-hora">Hora</label><input id="serie-hora" type="time" className="input" value={form.hora} onChange={(event) => setForm({ ...form, hora: event.target.value })} /></div>
            <Select label="Intervalo" value={form.intervaloSemanas} onChange={(value) => setForm({ ...form, intervaloSemanas: Number(value) })}>{[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value} semana(s)</option>)}</Select>
            <div><label className="label" htmlFor="serie-inicio">Início</label><input id="serie-inicio" type="date" className="input" value={form.dataInicio} onChange={(event) => setForm({ ...form, dataInicio: event.target.value })} /></div>
          </div>
          <p className="text-xs text-muted">As ocorrências futuras são regeneradas; o histórico passado é preservado.</p>
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setEditar(null)}>Cancelar</button><button className="btn-gold" disabled={aEnviar === editar?.id} onClick={guardarEdicao}>Guardar</button></div>
        </div>
      </Dialog>
      <Dialog open={detalhe !== null} onClose={() => setDetalhe(null)} title="Detalhe da série">
        {detalhe && <div className="space-y-5"><div className="rounded-sm border border-line bg-bg px-4 py-3 text-sm"><p className="font-semibold">{detalhe.cliente.nome} · {detalhe.servico.nome}</p><p className="text-muted">{descricao(detalhe)}{detalhe.profissional ? ` · ${detalhe.profissional.nome}` : ""}</p></div><section><h3 className="label">Próximas ocorrências ({detalhe.agendamentos.length})</h3><ul className="max-h-52 space-y-2 overflow-y-auto">{detalhe.agendamentos.map((a) => <li key={a.id} className="flex items-center justify-between rounded-sm border border-line px-3 py-2 text-sm"><span>{formatDataHora(a.dataHora)}</span><button className="btn-danger !px-2 !py-1 !text-xs" onClick={() => cancelarOcorrencia(detalhe, a.id)}>Cancelar apenas esta</button></li>)}</ul></section><section><h3 className="label">Exceções por resolver ({detalhe.excecoes.length})</h3>{detalhe.excecoes.length === 0 ? <p className="text-sm text-muted">Sem conflitos.</p> : <ul className="max-h-44 space-y-2 overflow-y-auto">{detalhe.excecoes.map((item) => <li key={item.id} className="rounded-sm border border-danger/30 px-3 py-2 text-sm"><div className="flex justify-between gap-3"><span>{formatDataHora(item.dataHora)}</span><button className="text-gold underline" onClick={() => tentarExcecao(detalhe.id, item.id)}>Tentar novamente</button></div><p className="mt-1 text-xs text-muted">{item.motivo}</p></li>)}</ul>}</section><div className="flex justify-end"><button className="btn-outline" onClick={() => setDetalhe(null)}>Fechar</button></div></div>}
      </Dialog>
      <Toaster />
    </div>
  );
}
