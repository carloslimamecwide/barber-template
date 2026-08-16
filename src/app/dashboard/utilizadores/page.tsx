import type { Metadata } from "next";
import { UtilizadoresView } from "@/components/dashboard/utilizadores-view";
export const metadata: Metadata = { title: "Utilizadores — Barbearia Nobre" };
export default function Page() { return <UtilizadoresView />; }
