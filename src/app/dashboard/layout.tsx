import { Scissors } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();
  if (!auth) redirect("/login");
  const session = await getSession();
  const [profissionais, servicos, horarios] = await Promise.all([
    prisma.profissional.count({ where: { ativo: true } }),
    prisma.servico.count({ where: { ativo: true } }),
    prisma.horarioFuncionamento.count({ where: { aberto: true } }),
  ]);
  const configuracaoPendente = profissionais === 0 || servicos === 0 || horarios === 0;

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-surface/60">
        <div className="flex items-center gap-2 border-b border-line px-5 py-5">
          <Scissors className="h-5 w-5 text-gold" />
          <span className="font-display text-xl font-semibold text-gold">
            Barbearia <span className="text-ink">Nobre</span>
          </span>
        </div>
        <SidebarNav role={auth.role} />
        <div className="border-t border-line p-3">
          <p className="truncate px-3 pb-2 text-xs text-muted">
            {session.email}
          </p>
          <LogoutButton />
        </div>
      </aside>
      <main className="ml-60 flex-1 p-6 sm:p-8">
        {configuracaoPendente && auth.role !== "profissional" && (
          <aside className="mb-6 rounded-sm border border-gold/40 bg-gold/10 px-5 py-4" aria-label="Configuração inicial">
            <p className="font-semibold text-gold">Conclui a configuração inicial</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link className={profissionais ? "text-success" : "text-ink underline"} href="/dashboard/profissionais">{profissionais ? "✓" : "1."} Criar profissional</Link>
              <Link className={servicos ? "text-success" : "text-ink underline"} href="/dashboard/servicos">{servicos ? "✓" : "2."} Criar serviço</Link>
              <Link className={horarios ? "text-success" : "text-ink underline"} href="/dashboard/horarios">{horarios ? "✓" : "3."} Definir horário</Link>
            </div>
          </aside>
        )}
        {children}
      </main>
    </div>
  );
}
