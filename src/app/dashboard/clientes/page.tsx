import type { Metadata } from "next";
import { ClientesView } from "@/components/dashboard/clientes-view";

export const metadata: Metadata = {
  title: "Clientes — Barbearia Nobre",
};

export default function ClientesPage() {
  return <ClientesView />;
}
