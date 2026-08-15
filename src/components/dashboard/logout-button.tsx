"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="btn-ghost w-full justify-start" onClick={sair}>
      <LogOut className="h-4 w-4" />
      Sair
    </button>
  );
}
