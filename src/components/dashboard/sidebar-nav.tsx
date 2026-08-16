"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, ScissorsLineDashed, Clock, BarChart3, Repeat, UserRound, Bell, Settings, ScrollText, ShieldCheck } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Agenda", icon: CalendarDays, exact: true },
  { href: "/dashboard/recorrentes", label: "Recorrentes", icon: Repeat, staff: true },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users, staff: true },
  { href: "/dashboard/profissionais", label: "Profissionais", icon: UserRound, staff: true },
  { href: "/dashboard/servicos", label: "Serviços", icon: ScissorsLineDashed, staff: true },
  { href: "/dashboard/horarios", label: "Horários", icon: Clock, staff: true },
  { href: "/dashboard/estatisticas", label: "Estatísticas", icon: BarChart3, staff: true },
  { href: "/dashboard/notificacoes", label: "Notificações", icon: Bell, staff: true },
  { href: "/dashboard/auditoria", label: "Auditoria", icon: ScrollText, admin: true },
  { href: "/dashboard/utilizadores", label: "Utilizadores", icon: ShieldCheck, admin: true },
  { href: "/dashboard/configuracao", label: "Configuração", icon: Settings, admin: true },
];

export function SidebarNav({ role }: { role: "admin" | "rececao" | "profissional" }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 p-3">
      {NAV.filter((item) => !(item.admin && role !== "admin") && !(item.staff && role === "profissional")).map((item) => {
        const ativo = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={ativo ? "nav-link-active" : "nav-link"}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
