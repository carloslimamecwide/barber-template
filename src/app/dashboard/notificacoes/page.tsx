import type { Metadata } from "next";
import { NotificacoesView } from "@/components/dashboard/notificacoes-view";
export const metadata: Metadata = { title: "Notificações — Barbearia Nobre" };
export default function Page() { return <NotificacoesView />; }
