import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { auditar } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { obterConfiguracao } from "@/lib/configuracao";
import { prisma } from "@/lib/prisma";
import { configuracaoSchema } from "@/lib/validations";

export async function GET() {
  if (!(await requireAdmin())) return apiError("FORBIDDEN", "Sem permissão", 403);
  return NextResponse.json(await obterConfiguracao());
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return apiError("UNAUTHORIZED", "Não autorizado", 401);
  const parsed = configuracaoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Configuração inválida", 422, parsed.error.issues);
  const configuracao = await prisma.configuracaoBarbearia.upsert({
    where: { id: "principal" }, create: { id: "principal", ...parsed.data }, update: parsed.data,
  });
  await auditar({ userId: auth.userId, acao: "atualizar", entidade: "ConfiguracaoBarbearia", entidadeId: configuracao.id, dados: parsed.data, request });
  return NextResponse.json(configuracao);
}
