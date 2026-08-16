import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/request";

export async function auditar(input: {
  userId?: string;
  acao: string;
  entidade: string;
  entidadeId?: string;
  dados?: Prisma.InputJsonValue;
  request?: Request;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      acao: input.acao,
      entidade: input.entidade,
      entidadeId: input.entidadeId,
      dados: input.dados,
      ip: input.request ? clientIp(input.request) : null,
    },
  });
}
