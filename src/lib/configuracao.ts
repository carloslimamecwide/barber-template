import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function obterConfiguracao(db: typeof prisma | Prisma.TransactionClient = prisma) {
  const existente = await db.configuracaoBarbearia.findUnique({ where: { id: "principal" } });
  return existente ?? db.configuracaoBarbearia.create({ data: { id: "principal" } });
}
