import type { Metadata } from "next";
import { RecorrentesView } from "@/components/dashboard/recorrentes-view";

export const metadata: Metadata = {
  title: "Recorrentes — Barbearia Nobre",
};

export default function RecorrentesPage() {
  return <RecorrentesView />;
}
