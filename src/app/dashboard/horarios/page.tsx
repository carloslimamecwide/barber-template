import type { Metadata } from "next";
import { HorariosView } from "@/components/dashboard/horarios-view";

export const metadata: Metadata = {
  title: "Horários — Barbearia Nobre",
};

export default function HorariosPage() {
  return <HorariosView />;
}
