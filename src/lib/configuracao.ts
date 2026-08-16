import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function obterConfiguracao(db: typeof prisma | Prisma.TransactionClient = prisma) {
  return db.configuracaoBarbearia.upsert({
    where: { id: "principal" },
    create: { id: "principal" },
    update: {},
  });
}
