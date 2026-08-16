import type { Metadata } from "next";
import { DisponibilidadeProfissionalView } from "@/components/dashboard/disponibilidade-profissional-view";
export const metadata: Metadata = { title: "Disponibilidade profissional — Barbearia Nobre" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <DisponibilidadeProfissionalView profissionalId={id} />; }
