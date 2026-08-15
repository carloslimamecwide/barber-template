import type { Metadata } from "next";
import { EstatisticasView } from "@/components/dashboard/estatisticas-view";

export const metadata: Metadata = {
  title: "Estatísticas — Barbearia Nobre",
};

export default function EstatisticasPage() {
  return <EstatisticasView />;
}
