import { Scissors } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const bloqueadas = await prisma.serieRecorrente.count({
    where: { estado: "bloqueada" },
  });

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-surface/60">
        <div className="flex items-center gap-2 border-b border-line px-5 py-5">
          <Scissors className="h-5 w-5 text-gold" />
          <span className="font-display text-xl font-semibold text-gold">
            Barbearia <span className="text-ink">Nobre</span>
          </span>
        </div>
        <SidebarNav />
        <div className="border-t border-line p-3">
          <p className="truncate px-3 pb-2 text-xs text-muted">
            {session.email}
          </p>
          <LogoutButton />
        </div>
      </aside>
      <main className="ml-60 flex-1 p-6 sm:p-8">
        {bloqueadas > 0 && (
          <Link
            href="/dashboard/recorrentes"
            className="mb-6 flex items-center justify-between rounded-sm border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold"
          >
            <span>
              {bloqueadas === 1
                ? "1 série recorrente bloqueada por conflito."
                : `${bloqueadas} séries recorrentes bloqueadas por conflito.`}
            </span>
            <span className="font-semibold">Ver detalhes</span>
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}
