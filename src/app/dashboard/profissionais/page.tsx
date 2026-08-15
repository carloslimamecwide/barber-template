import type { Metadata } from "next";
import { ProfissionaisView } from "@/components/dashboard/profissionais-view";

export const metadata: Metadata = {
  title: "Profissionais — Barbearia Nobre",
};

export default function ProfissionaisPage() {
  return <ProfissionaisView />;
}
