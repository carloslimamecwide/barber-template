import type { Metadata } from "next";
import { ServicosView } from "@/components/dashboard/servicos-view";

export const metadata: Metadata = {
  title: "Serviços — Barbearia Nobre",
};

export default function ServicosPage() {
  return <ServicosView />;
}
