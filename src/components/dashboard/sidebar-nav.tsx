"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, ScissorsLineDashed, Clock, BarChart3, Repeat, UserRound } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Agenda", icon: CalendarDays, exact: true },
  { href: "/dashboard/recorrentes", label: "Recorrentes", icon: Repeat },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/profissionais", label: "Profissionais", icon: UserRound },
  { href: "/dashboard/servicos", label: "Serviços", icon: ScissorsLineDashed },
  { href: "/dashboard/horarios", label: "Horários", icon: Clock },
  { href: "/dashboard/estatisticas", label: "Estatísticas", icon: BarChart3 },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 p-3">
      {NAV.map((item) => {
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
