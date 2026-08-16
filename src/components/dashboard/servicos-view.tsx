"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { toast, Toaster } from "@/components/ui/toaster";
import { useConfirm } from "@/hooks/use-confirm";
import { formatPreco } from "@/lib/format";

type Servico = {
  id: string;
  nome: string;
  precoCents: number;
  duracaoMin: number;
  ativo: boolean;
};

const VAZIO = { nome: "", preco: "", duracao: "" };

export function ServicosView() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editar, setEditar] = useState<Servico | null>(null);
  const [form, setForm] = useState(VAZIO);
  const [aEnviar, setAEnviar] = useState(false);
  const { confirm, dialog } = useConfirm();

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/servicos");
      const json = await res.json();
      if (!res.ok || !Array.isArray(json)) throw new Error("Resposta inválida");
      setServicos(json);
    } catch {
      toast("Erro ao carregar serviços", "erro");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  function abrirNovo() {
    setEditar(null);
    setForm(VAZIO);
    setModal(true);
  }

  function abrirEdicao(s: Servico) {
    setEditar(s);
    setForm({
      nome: s.nome,
      preco: String(s.precoCents),
      duracao: String(s.duracaoMin),
    });
    setModal(true);
  }

  async function guardar() {
    const precoCents = Number(form.preco);
    const duracaoMin = Number(form.duracao);
    if (!form.nome.trim() || !precoCents || !duracaoMin) {
      toast("Preenche todos os campos", "erro");
      return;
    }
    setAEnviar(true);
    try {
      const res = await fetch(
        editar ? `/api/servicos/${editar.id}` : "/api/servicos",
        {
          method: editar ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: form.nome,
            precoCents,
            duracaoMin,
            ativo: true,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "Erro ao guardar", "erro");
        return;
      }
      toast(editar ? "Serviço atualizado" : "Serviço criado");
      setModal(false);
      carregar();
    } catch {
      toast("Erro de ligação", "erro");
    } finally {
      setAEnviar(false);
    }
  }

  async function apagar(s: Servico) {
    const confirmado = await confirm({
      title: "Arquivar serviço?",
      description: `Arquivar o serviço "${s.nome}"? O histórico será preservado.`,
      confirmText: "Arquivar",
      variant: "danger",
    });
    if (!confirmado) return;
    const res = await fetch(`/api/servicos/${s.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Serviço arquivado");
      carregar();
    } else {
      toast("Não foi possível apagar", "erro");
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Serviços</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">
            Tabela de preços
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            A duração de cada serviço define as horas disponíveis na marcação
            online.
          </p>
        </div>
        <button className="btn-gold" onClick={abrirNovo}>
          <Plus className="h-4 w-4" />
          Novo serviço
        </button>
      </div>

      {carregando ? (
        <p className="text-muted">A carregar…</p>
      ) : servicos.length === 0 ? (
        <div className="card card-pad text-center text-muted">
          Sem serviços registados.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <th className="px-5 py-3">Serviço</th>
                <th className="px-5 py-3">Duração</th>
                <th className="px-5 py-3">Preço</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">A&ccedil;&otilde;es</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {servicos.map((s) => (
                <tr key={s.id} className="hover:bg-surface2/60">
                  <td className="px-5 py-3 font-semibold text-ink">{s.nome}</td>
                  <td className="px-5 py-3 text-muted">{s.duracaoMin} min</td>
                  <td className="px-5 py-3 text-gold">{formatPreco(s.precoCents)}</td>
                  <td className="px-5 py-3">
                    {s.ativo ? (
                      <span className="badge-green">Ativo</span>
                    ) : (
                      <span className="badge-gray">Inativo</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost !p-2" onClick={() => abrirEdicao(s)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="btn-ghost !p-2 hover:!text-danger" onClick={() => apagar(s)} aria-label="Apagar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={modal}
        onClose={() => setModal(false)}
        title={editar ? "Editar serviço" : "Novo serviço"}
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="sv-nome">
              Nome
            </label>
            <input
              id="sv-nome"
              className="input"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex.: Corte + Barba"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="sv-preco">
                Preço (cêntimos)
              </label>
              <input
                id="sv-preco"
                type="number"
                className="input"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                placeholder="1200 = 12€"
              />
            </div>
            <div>
              <label className="label" htmlFor="sv-duracao">
                Duração (min)
              </label>
              <input
                id="sv-duracao"
                type="number"
                className="input"
                value={form.duracao}
                onChange={(e) => setForm({ ...form, duracao: e.target.value })}
                placeholder="30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-outline" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button className="btn-gold" onClick={guardar} disabled={aEnviar}>
              {aEnviar ? "A guardar…" : "Guardar"}
            </button>
          </div>
        </div>
      </Dialog>

      {dialog}
      <Toaster />
    </div>
  );
}
