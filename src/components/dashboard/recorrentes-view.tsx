"use client";

import { useCallback, useEffect, useState } from "react";
import { Repeat } from "lucide-react";
import { toast, Toaster } from "@/components/ui/toaster";
import { useConfirm } from "@/hooks/use-confirm";
import { formatDataHora, nomeDiaSemana } from "@/lib/format";

type Serie = {
  id: string;
  diaDaSemana: number;
  hora: string;
  intervaloSemanas: number;
  estado: "ativa" | "bloqueada" | "cancelada";
  motivoBloqueio: string | null;
  cliente: { id: string; nome: string; telefone: string };
  servico: { id: string; nome: string; duracaoMin: number; precoCents: number };
  profissional: { id: string; nome: string } | null;
  agendamentos: { id: string; dataHora: string; status: string }[];
};

const ESTADO: Record<string, { label: string; classe: string }> = {
  ativa: { label: "Ativa", classe: "badge-green" },
  bloqueada: { label: "Bloqueada", classe: "badge-red" },
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

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/series");
      setSeries(await res.json());
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
        method: url.endsWith("/retomar") ? "POST" : "DELETE",
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

  function retomar(s: Serie) {
    acao(s.id, `/api/series/${s.id}/retomar`, "Série retomada");
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
                  {s.motivoBloqueio && (
                    <p className="mt-0.5 text-xs text-red-400">
                      Parou em {s.motivoBloqueio}: hora ocupada ou dia fechado.
                      Resolve e retoma.
                    </p>
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
                  {s.estado === "bloqueada" && (
                    <button
                      className="btn-outline !py-1.5 !px-3 !text-xs"
                      disabled={aEnviar === s.id}
                      onClick={() => retomar(s)}
                    >
                      Retomar
                    </button>
                  )}
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
      <Toaster />
    </div>
  );
}
