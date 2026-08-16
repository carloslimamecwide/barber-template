"use client";

import { useCallback, useEffect, useState } from "react";
import { toast, Toaster } from "@/components/ui/toaster";
import { formatPreco } from "@/lib/format";

type Estatisticas = {
  mes: string;
  faturacao: number;
  totalMarcacoes: number;
  concluidos: number;
  proximos: number;
  porServico: { nome: string; quantidade: number; total: number }[];
  porCliente: { nome: string; quantidade: number; total: number }[];
};

function mesAtual(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

export function EstatisticasView() {
  const [mes, setMes] = useState(mesAtual());
  const [dados, setDados] = useState<Estatisticas | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async (m: string) => {
    try {
      const res = await fetch(`/api/estatisticas?mes=${m}`);
      const json = await res.json();
      if (!res.ok || !json?.porServico) throw new Error("Resposta inválida");
      setDados(json);
    } catch {
      toast("Erro ao carregar estatísticas", "erro");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar(mes);
  }, [mes, carregar]);

  const maxServico = dados?.porServico[0]?.total ?? 1;
  const maxCliente = dados?.porCliente[0]?.quantidade ?? 1;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Estatísticas</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">
            Números do mês
          </h1>
        </div>
        <input
          type="month"
          className="input !w-auto"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        />
      </div>

      {carregando || !dados ? (
        <p className="text-muted">A carregar…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Faturação",
                valor: formatPreco(dados.faturacao),
                cor: "text-gold",
                sub: "Serviços concluídos no mês",
              },
              {
                label: "Marcações no mês",
                valor: String(dados.totalMarcacoes),
                cor: "text-ink",
                sub: "Todas as marcações do mês, em qualquer estado",
              },
              {
                label: "Concluídas",
                valor: String(dados.concluidos),
                cor: "text-ink",
                sub: "Serviços terminados no mês",
              },
              {
                label: "Por atender",
                valor: String(dados.proximos),
                cor: "text-ink",
                sub: "Marcações agendadas para o futuro",
              },
            ].map((c, i) => (
              <div
                key={c.label}
                className="card card-pad animate-rise"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {c.label}
                </p>
                <p className={`mt-2 font-display text-4xl font-semibold ${c.cor}`}>
                  {c.valor}
                </p>
                <p className="mt-1 text-xs text-muted">{c.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="card card-pad">
              <h2 className="font-display text-2xl font-semibold text-gold">
                Faturação por serviço
              </h2>
              {dados.porServico.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  Sem serviços concluídos neste mês.
                </p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {dados.porServico.map((s) => (
                    <li key={s.nome}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold text-ink">
                          {s.nome}
                          <span className="ml-2 text-muted">×{s.quantidade}</span>
                        </span>
                        <span className="text-gold">{formatPreco(s.total)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-bg">
                        <div
                          className="h-full rounded-full bg-gold/80"
                          style={{ width: `${(s.total / maxServico) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card card-pad">
              <h2 className="font-display text-2xl font-semibold text-gold">
                Clientes mais frequentes
              </h2>
              {dados.porCliente.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  Sem dados neste mês.
                </p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {dados.porCliente.slice(0, 8).map((c, i) => (
                    <li key={c.nome}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold text-ink">
                          {i + 1}. {c.nome}
                          <span className="ml-2 text-muted">×{c.quantidade}</span>
                        </span>
                        <span className="text-muted">{formatPreco(c.total)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-bg">
                        <div
                          className="h-full rounded-full bg-gold-soft/70"
                          style={{ width: `${(c.quantidade / maxCliente) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      <Toaster />
    </div>
  );
}
