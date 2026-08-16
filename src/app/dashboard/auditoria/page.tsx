import type { Metadata } from "next";
import { AuditoriaView } from "@/components/dashboard/auditoria-view";
export const metadata: Metadata = { title: "Auditoria — Barbearia Nobre" };
export default function Page() { return <AuditoriaView />; }
