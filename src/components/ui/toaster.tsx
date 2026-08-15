"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; mensagem: string; tipo: "sucesso" | "erro" };

let listener: ((toast: Omit<Toast, "id">) => void) | null = null;
let contador = 0;

export function toast(mensagem: string, tipo: "sucesso" | "erro" = "sucesso") {
  listener?.({ mensagem, tipo });
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listener = ({ mensagem, tipo }) => {
      const id = ++contador;
      setToasts((prev) => [...prev, { id, mensagem, tipo }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };
    return () => {
      listener = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-rise pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-xl backdrop-blur ${
            t.tipo === "sucesso"
              ? "border-success/40 bg-surface/95 text-success"
              : "border-danger/40 bg-surface/95 text-danger"
          }`}
        >
          {t.mensagem}
        </div>
      ))}
    </div>
  );
}
