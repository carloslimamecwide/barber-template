import { prisma } from "@/lib/prisma";

export async function consumirLimite(input: {
  chave: string;
  limite: number;
  janelaMs: number;
}): Promise<{ permitido: boolean; restante: number; retryAfter: number }> {
  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + input.janelaMs);

  const bucket = await prisma.$transaction(async (tx) => {
    const atual = await tx.limiteAcesso.findUnique({ where: { chave: input.chave } });
    if (!atual || atual.expiraEm <= agora) {
      return tx.limiteAcesso.upsert({
        where: { chave: input.chave },
        create: { chave: input.chave, tentativas: 1, janelaInicio: agora, expiraEm },
        update: { tentativas: 1, janelaInicio: agora, expiraEm },
      });
    }
    return tx.limiteAcesso.update({
      where: { chave: input.chave },
      data: { tentativas: { increment: 1 } },
    });
  });

  return {
    permitido: bucket.tentativas <= input.limite,
    restante: Math.max(0, input.limite - bucket.tentativas),
    retryAfter: Math.max(1, Math.ceil((bucket.expiraEm.getTime() - agora.getTime()) / 1000)),
  };
}
