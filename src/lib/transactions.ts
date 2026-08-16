import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function transacaoSerializavel<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
  tentativas = 3,
): Promise<T> {
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: "Serializable" });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code !== "P2034" || tentativa === tentativas) throw error;
    }
  }
  throw new Error("Falha inesperada ao concluir transação");
}
