import Link from "next/link";
import { Scissors } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BookingForm } from "@/components/landing/booking-form";
import { Toaster } from "@/components/ui/toaster";
import { DIAS_SEMANA, formatPreco } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getDados() {
  try {
    const [servicos, horarios] = await Promise.all([
      prisma.servico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
      prisma.horarioFuncionamento.findMany({ orderBy: { diaDaSemana: "asc" } }),
    ]);
    return { servicos, horarios };
  } catch (error) {
    console.error("Erro ao carregar dados da landing page:", error);
    return { servicos: [], horarios: [] };
  }
}

export default async function LandingPage() {
  const { servicos, horarios } = await getDados();
  const horariosOrdenados = [...horarios].sort((a, b) => {
    if (a.diaDaSemana === 0) return 1;
    if (b.diaDaSemana === 0) return -1;
    return a.diaDaSemana - b.diaDaSemana;
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 font-display text-2xl font-semibold tracking-wide text-gold">
            <Scissors className="h-5 w-5" />
            Barbearia <span className="text-ink">Nobre</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#servicos" className="hidden text-muted transition-colors hover:text-gold sm:block">
              Serviços
            </a>
            <a href="#horario" className="hidden text-muted transition-colors hover:text-gold sm:block">
              Horário
            </a>
            <a href="#marcar" className="btn-gold !py-2 !px-4">
              Marcar
            </a>
            <Link href="/login" className="btn-ghost !py-2 !px-3">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_0%,rgba(201,162,75,0.12),transparent_65%)]" />
          <div className="mx-auto max-w-6xl px-5 pb-20 pt-24 text-center sm:pt-32">
            <p className="eyebrow animate-rise">Desde 1987 · Lisboa</p>
            <h1
              className="animate-rise mx-auto mt-5 max-w-3xl font-display text-6xl font-semibold leading-[0.95] tracking-tight sm:text-8xl"
              style={{ animationDelay: "0.08s" }}
            >
              Arte de bem <span className="text-gold italic">parecer</span>,
              sempre.
            </h1>
            <p
              className="animate-rise mx-auto mt-6 max-w-xl text-base text-muted sm:text-lg"
              style={{ animationDelay: "0.16s" }}
            >
              Corte clássico, barba tratada e navalha. Marca a tua hora em
              menos de um minuto — sem chamadas, sem esperas.
            </p>
            <div
              className="animate-rise mt-10 flex flex-wrap items-center justify-center gap-4"
              style={{ animationDelay: "0.24s" }}
            >
              <a href="#marcar" className="btn-gold !px-8 !py-3.5 !text-base">
                Marcar agora
              </a>
              <a href="#servicos" className="btn-outline !px-8 !py-3.5 !text-base">
                Ver serviços
              </a>
            </div>
          </div>
        </section>

        <section id="servicos" className="border-t border-line/60 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <p className="eyebrow">Serviços</p>
            <h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
              O que fazemos
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {servicos.length === 0 && (
                <p className="col-span-full text-muted">
                  Em breve. (Configura a base de dados para veres os serviços.)
                </p>
              )}
              {servicos.map((s, i) => (
                <div
                  key={s.id}
                  className="animate-rise card group p-6 transition-colors hover:border-gold/50"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="flex items-start justify-between">
                    <Scissors className="h-5 w-5 text-gold/70" />
                    <span className="badge-gray">{s.duracaoMin} min</span>
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-semibold text-ink group-hover:text-gold">
                    {s.nome}
                  </h3>
                  <p className="mt-1 text-lg text-gold">
                    {formatPreco(s.precoCents)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="horario" className="border-t border-line/60 bg-surface/40 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="eyebrow">Horário</p>
                <h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
                  Quando podes <span className="text-gold italic">vir</span>
                </h2>
                <p className="mt-5 max-w-md text-muted">
                  Atendimento por marcação. Dias fechados (feriados e férias)
                  são sempre anunciados aqui.
                </p>
              </div>
              <ul className="card divide-y divide-line overflow-hidden">
                {horariosOrdenados.map((h) => {
                  const dia = DIAS_SEMANA.find((d) => d.valor === h.diaDaSemana);
                  return (
                    <li key={h.diaDaSemana} className="flex items-center justify-between px-5 py-3.5 text-sm">
                      <span className="text-ink">{dia?.nome}</span>
                      <span className={h.aberto ? "text-gold" : "text-danger"}>
                        {h.aberto ? `${h.abertura} – ${h.fecho}` : "Fechado"}
                      </span>
                    </li>
                  );
                })}
                {horarios.length === 0 && (
                  <li className="px-5 py-4 text-sm text-muted">
                    Horário por configurar.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>

        <section id="marcar" className="border-t border-line/60 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
              <div>
                <p className="eyebrow">Marcação online</p>
                <h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
                  Escolhe o teu <span className="text-gold italic">momento</span>
                </h2>
                <div className="mt-6 space-y-2 text-muted">
                  <p>1 · Escolhe o serviço e o dia</p>
                  <p>2 · Vê só as horas que estão livres</p>
                  <p>3 · Recebes a confirmação por email</p>
                </div>
              </div>
              <BookingForm servicos={servicos} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-muted sm:flex-row">
          <p className="font-display text-xl text-gold">Barbearia Nobre</p>
          <p>Rua da Barbearia 12, Lisboa · 21 345 6789</p>
          <p>© {new Date().getFullYear()}</p>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}
