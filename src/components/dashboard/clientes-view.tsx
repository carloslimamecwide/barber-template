"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { toast, Toaster } from "@/components/ui/toaster";
import { useConfirm } from "@/hooks/use-confirm";
import { formatData } from "@/lib/format";

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  notas: string | null;
  createdAt: string;
  _count: { agendamentos: number };
  ativo: boolean;
};

const VAZIO = { nome: "", telefone: "", email: "", notas: "" };

export function ClientesView() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editar, setEditar] = useState<Cliente | null>(null);
  const [form, setForm] = useState(VAZIO);
  const [aEnviar, setAEnviar] = useState(false);
  const { confirm, dialog } = useConfirm();

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/clientes");
      const json = await res.json();
      if (!res.ok || !Array.isArray(json)) throw new Error("Resposta inválida");
      setClientes(json);
    } catch {
      toast("Erro ao carregar clientes", "erro");
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

  function abrirEdicao(c: Cliente) {
    setEditar(c);
    setForm({
      nome: c.nome,
      telefone: c.telefone,
      email: c.email ?? "",
      notas: c.notas ?? "",
    });
    setModal(true);
  }

  async function guardar() {
    if (!form.nome.trim() || !form.telefone.trim()) {
      toast("Nome e telefone são obrigatórios", "erro");
      return;
    }
    setAEnviar(true);
    try {
      const res = await fetch(
        editar ? `/api/clientes/${editar.id}` : "/api/clientes",
        {
          method: editar ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "Erro ao guardar", "erro");
        return;
      }
      toast(editar ? "Cliente atualizado" : "Cliente criado");
      setModal(false);
      carregar();
    } catch {
      toast("Erro de ligação", "erro");
    } finally {
      setAEnviar(false);
    }
  }

  async function apagar(c: Cliente) {
    const confirmado = await confirm({
      title: "Arquivar cliente?",
      description: `Arquivar ${c.nome}? O histórico de marcações será preservado.`,
      confirmText: "Arquivar",
      variant: "danger",
    });
    if (!confirmado) return;
    const res = await fetch(`/api/clientes/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Cliente arquivado");
      carregar();
    } else {
      toast("Não foi possível apagar", "erro");
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Clientes</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">Registo</h1>
        </div>
        <button className="btn-gold" onClick={abrirNovo}>
          <Plus className="h-4 w-4" />
          Novo cliente
        </button>
      </div>

      {carregando ? (
        <p className="text-muted">A carregar…</p>
      ) : clientes.length === 0 ? (
        <div className="card card-pad text-center text-muted">
          Sem clientes registados.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Telefone</th>
                <th className="hidden px-5 py-3 sm:table-cell">Email</th>
                <th className="hidden px-5 py-3 md:table-cell">Desde</th>
                <th className="px-5 py-3">Marca&ccedil;&otilde;es</th>
                <th className="px-5 py-3 text-right">A&ccedil;&otilde;es</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-surface2/60">
                  <td className="px-5 py-3 font-semibold text-ink">{c.nome}{!c.ativo && <span className="badge-gray ml-2">Arquivado</span>}</td>
                  <td className="px-5 py-3 text-muted">{c.telefone}</td>
                  <td className="hidden px-5 py-3 text-muted sm:table-cell">
                    {c.email ?? "—"}
                  </td>
                  <td className="hidden px-5 py-3 text-muted md:table-cell">
                    {formatData(c.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="badge-gray">{c._count.agendamentos}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost !p-2" onClick={() => abrirEdicao(c)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="btn-ghost !p-2 hover:!text-danger" onClick={() => apagar(c)} aria-label="Apagar">
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
        title={editar ? "Editar cliente" : "Novo cliente"}
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="cl-nome">
              Nome
            </label>
            <input
              id="cl-nome"
              className="input"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="cl-tel">
              Telefone
            </label>
            <input
              id="cl-tel"
              className="input"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="cl-email">
              Email
            </label>
            <input
              id="cl-email"
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="cl-notas">
              Notas
            </label>
            <input
              id="cl-notas"
              className="input"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Preferências, alergias…"
            />
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
