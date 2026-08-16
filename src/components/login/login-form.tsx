"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Scissors } from "lucide-react";
import { messageFromResponse } from "@/lib/http";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setAEnviar(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setErro(messageFromResponse(json, "Erro ao entrar"));
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErro("Erro de ligação");
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Scissors className="mx-auto h-8 w-8 text-gold" />
          <h1 className="mt-4 font-display text-4xl font-semibold text-gold">
            Barbearia Nobre
          </h1>
          <p className="mt-2 text-sm text-muted">Área do barbeiro</p>
        </div>

        <form onSubmit={submeter} className="card card-pad space-y-5">
          <div>
            <label className="label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="login-password">
              Palavra-passe
            </label>
            <input
              id="login-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {erro && (
            <p className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {erro}
            </p>
          )}
          <button className="btn-gold w-full" disabled={aEnviar}>
            {aEnviar ? "A entrar…" : "Entrar"}
          </button>
          <Link href="/" className="btn-ghost w-full">
            Voltar à página inicial
          </Link>
        </form>
      </div>
    </div>
  );
}
