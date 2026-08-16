"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-5"><div className="card card-pad w-full text-center"><p className="eyebrow">Erro inesperado</p><h1 className="mt-3 font-display text-3xl font-semibold">Não foi possível abrir esta área</h1><p className="mt-3 text-sm text-muted">Tenta novamente. Se o problema continuar, verifica o estado do serviço.</p><button className="btn-gold mt-6" onClick={reset}>Tentar novamente</button></div></main>;
}
