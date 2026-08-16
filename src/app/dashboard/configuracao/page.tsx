import type { Metadata } from "next";
import { ConfiguracaoView } from "@/components/dashboard/configuracao-view";

export const metadata: Metadata = { title: "Configuração — Barbearia Nobre" };
export default function Page() { return <ConfiguracaoView />; }
