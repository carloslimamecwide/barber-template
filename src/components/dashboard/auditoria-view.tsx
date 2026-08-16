"use client";

import { useCallback, useEffect, useState } from "react";
import { toast, Toaster } from "@/components/ui/toaster";
import { formatDataHora } from "@/lib/format";

type Log = { id: string; acao: string; entidade: string; entidadeId: string | null; dados: unknown; ip: string | null; criadoEm: string; user: { email: string } | null };
export function AuditoriaView() {
  const [items, setItems] = useState<Log[]>([]); const [carregando, setCarregando] = useState(true);
  const carregar = useCallback(async () => { try { const r = await fetch("/api/auditoria?pageSize=100"); if (!r.ok) throw new Error(); setItems((await r.json()).items); } catch { toast("Erro ao carregar auditoria", "erro"); } finally { setCarregando(false); } }, []);
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);
  return <div><div className="mb-8"><p className="eyebrow">Segurança</p><h1 className="mt-2 font-display text-4xl font-semibold">Auditoria</h1><p className="mt-2 text-sm text-muted">Histórico das alterações administrativas relevantes.</p></div>{carregando ? <p className="text-muted">A carregar…</p> : items.length === 0 ? <div className="card card-pad text-center text-muted">Ainda não existem eventos de auditoria.</div> : <ol className="card divide-y divide-line">{items.map((item) => <li key={item.id} className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[11rem_1fr_12rem]"><time className="text-muted">{formatDataHora(item.criadoEm)}</time><div><p><span className="font-semibold text-gold">{item.acao}</span> · {item.entidade}</p>{item.entidadeId && <p className="text-xs text-muted">{item.entidadeId}</p>}</div><div className="text-xs text-muted md:text-right"><p>{item.user?.email ?? "sistema/cliente"}</p><p>{item.ip ?? "—"}</p></div></li>)}</ol>}<Toaster /></div>;
}
