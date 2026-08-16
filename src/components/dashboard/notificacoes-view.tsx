"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Select } from "@/components/ui/select";
import { toast, Toaster } from "@/components/ui/toaster";
import { formatDataHora } from "@/lib/format";

type Item = { id: string; tipo: string; estado: string; destinatario: string; tentativas: number; ultimoErro: string | null; criadaEm: string; proximaTentativaEm: string; agendamento: { cliente: { nome: string }; servico: { nome: string }; dataHora: string } | null };
type Resultado = { items: Item[]; total: number; page: number; totalPages: number; ultimaExecucao: { inicio: string; sucesso: boolean | null } | null };

export function NotificacoesView() {
  const [dados, setDados] = useState<Resultado>({ items: [], total: 0, page: 1, totalPages: 1, ultimaExecucao: null });
  const [estado, setEstado] = useState(""); const [carregando, setCarregando] = useState(true);
  const carregar = useCallback(async () => { setCarregando(true); try { const p = new URLSearchParams({ pageSize: "50" }); if (estado) p.set("estado", estado); const r = await fetch(`/api/notificacoes?${p}`); if (!r.ok) throw new Error(); setDados(await r.json()); } catch { toast("Erro ao carregar notificações", "erro"); } finally { setCarregando(false); } }, [estado]);
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);
  async function retry(ids?: string[]) { const r = await fetch("/api/notificacoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids ? { ids } : { todasFalhadas: true }) }); const json = await r.json(); if (r.ok) { toast(`${json.atualizadas} email(s) colocado(s) em fila`); carregar(); } else toast("Não foi possível reenviar", "erro"); }
  return <div><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Operação</p><h1 className="mt-2 font-display text-4xl font-semibold">Notificações</h1><p className="mt-2 text-sm text-muted">Último cron: {dados.ultimaExecucao ? `${formatDataHora(dados.ultimaExecucao.inicio)} · ${dados.ultimaExecucao.sucesso === false ? "falhou" : "concluído"}` : "ainda não executado"}</p></div><button className="btn-outline" onClick={() => retry()}><RefreshCw className="h-4 w-4" />Reenviar todas as falhadas</button></div>
    <div className="mb-4 max-w-xs"><Select label="Estado" value={estado} onChange={setEstado}><option value="">Todos</option><option value="pendente">Pendentes</option><option value="processando">Em processamento</option><option value="enviada">Enviadas</option><option value="falhada">Falhadas</option></Select></div>
    {carregando ? <p className="text-muted">A carregar…</p> : dados.items.length === 0 ? <div className="card card-pad text-center text-muted">Sem notificações neste estado.</div> : <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line text-xs uppercase tracking-wider text-muted"><th className="px-5 py-3">Criada</th><th className="px-5 py-3">Destinatário</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Detalhe</th><th className="px-5 py-3 text-right">Ação</th></tr></thead><tbody className="divide-y divide-line">{dados.items.map((n) => <tr key={n.id}><td className="px-5 py-3 text-muted">{formatDataHora(n.criadaEm)}</td><td className="px-5 py-3"><p className="font-semibold">{n.agendamento?.cliente.nome ?? n.destinatario}</p><p className="text-xs text-muted">{n.destinatario}</p></td><td className="px-5 py-3 text-muted">{n.tipo}</td><td className="px-5 py-3"><span className={n.estado === "falhada" ? "badge-red" : n.estado === "enviada" ? "badge-green" : "badge-gold"}>{n.estado}</span></td><td className="max-w-xs px-5 py-3 text-xs text-muted">{n.ultimoErro ?? `${n.tentativas} tentativa(s)`}</td><td className="px-5 py-3 text-right">{n.estado === "falhada" ? <button className="btn-outline !px-3 !py-1.5 !text-xs" onClick={() => retry([n.id])}>Reenviar</button> : "—"}</td></tr>)}</tbody></table></div>}
    <Toaster /></div>;
}
