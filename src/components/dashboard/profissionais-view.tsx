"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, UserRound } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { toast, Toaster } from "@/components/ui/toaster";
import { useConfirm } from "@/hooks/use-confirm";

type Profissional = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
};

const VAZIO = { nome: "", telefone: "", email: "" };

export function ProfissionaisView() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [modal, setModal] = useState(false);
  const [editar, setEditar] = useState<Profissional | null>(null);
  const [form, setForm] = useState(VAZIO);
  const [aEnviar, setAEnviar] = useState(false);
  const { confirm, dialog } = useConfirm();

  const carregar = useCallback(async () => {
    const res = await fetch("/api/profissionais");
    if (!res.ok) {
      toast("Erro ao carregar profissionais", "erro");
      return;
    }
    setProfissionais(await res.json());
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

  function abrirEdicao(profissional: Profissional) {
    setEditar(profissional);
    setForm({
      nome: profissional.nome,
      telefone: profissional.telefone ?? "",
      email: profissional.email ?? "",
    });
    setModal(true);
  }

  async function guardar() {
    if (!form.nome.trim()) {
      toast("O nome é obrigatório", "erro");
      return;
    }
    setAEnviar(true);
    try {
      const res = await fetch(editar ? `/api/profissionais/${editar.id}` : "/api/profissionais", {
        method: editar ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error ?? "Erro ao guardar", "erro");
        return;
      }
      toast(editar ? "Profissional atualizado" : "Profissional criado");
      setModal(false);
      carregar();
    } catch {
      toast("Erro de ligação", "erro");
    } finally {
      setAEnviar(false);
    }
  }

  async function desativar(profissional: Profissional) {
    const confirmado = await confirm({
      title: "Desativar profissional?",
      description: `Desativar ${profissional.nome}? As marcações existentes serão preservadas.`,
      confirmText: "Desativar",
      variant: "danger",
    });
    if (!confirmado) return;
    const res = await fetch(`/api/profissionais/${profissional.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Profissional desativado");
      carregar();
    } else {
      toast("Não foi possível desativar", "erro");
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Equipa</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">Profissionais</h1>
          <p className="mt-2 max-w-md text-sm text-muted">Organiza a agenda por barbeiro sem perder o histórico existente.</p>
        </div>
        <button className="btn-gold" onClick={abrirNovo}><Plus className="h-4 w-4" />Novo profissional</button>
      </div>

      {profissionais.length === 0 ? (
        <div className="card card-pad text-center text-muted">Ainda não existem profissionais. Adiciona o primeiro para ativar a agenda por barbeiro.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Lista de profissionais</caption>
            <thead><tr className="border-b border-line text-xs uppercase tracking-wider text-muted"><th className="px-5 py-3">Nome</th><th className="px-5 py-3">Telefone</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-line">
              {profissionais.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 font-semibold text-ink"><span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-gold" />{p.nome}</span></td>
                  <td className="px-5 py-3 text-muted">{p.telefone ?? "—"}</td>
                  <td className="px-5 py-3 text-muted">{p.email ?? "—"}</td>
                  <td className="px-5 py-3">{p.ativo ? <span className="badge-green">Ativo</span> : <span className="badge-gray">Inativo</span>}</td>
                  <td className="px-5 py-3"><div className="flex justify-end gap-1"><button className="btn-ghost !p-2" onClick={() => abrirEdicao(p)} aria-label={`Editar ${p.nome}`}><Pencil className="h-4 w-4" /></button>{p.ativo && <button className="btn-danger !py-1.5 !px-3 !text-xs" onClick={() => desativar(p)}>Desativar</button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modal} onClose={() => setModal(false)} title={editar ? "Editar profissional" : "Novo profissional"}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
          <div><label className="label" htmlFor="pf-nome">Nome</label><input id="pf-nome" name="nome" className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoComplete="name" /></div>
          <div><label className="label" htmlFor="pf-telefone">Telefone (opcional)</label><input id="pf-telefone" name="telefone" className="input" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} inputMode="tel" autoComplete="tel" /></div>
          <div><label className="label" htmlFor="pf-email">Email (opcional)</label><input id="pf-email" name="email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-outline" onClick={() => setModal(false)}>Cancelar</button><button type="submit" className="btn-gold" disabled={aEnviar}>{aEnviar ? "A guardar…" : "Guardar profissional"}</button></div>
        </form>
      </Dialog>
      {dialog}
      <Toaster />
    </div>
  );
}
