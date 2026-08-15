import type { Metadata } from "next";
import { AgendaView } from "@/components/dashboard/agenda-view";

export const metadata: Metadata = {
  title: "Agenda — Barbearia Nobre",
};

export default function DashboardPage() {
  return <AgendaView />;
}
