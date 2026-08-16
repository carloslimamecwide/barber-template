import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionData } from "@/lib/session";

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;

export async function verifyBarberCredentials(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user?.ativo) return null;
  if (user.bloqueadoAte && user.bloqueadoAte > new Date()) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const falhas = user.tentativasFalhas + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tentativasFalhas: falhas >= MAX_TENTATIVAS ? 0 : falhas,
        bloqueadoAte: falhas >= MAX_TENTATIVAS ? new Date(Date.now() + BLOQUEIO_MS) : null,
      },
    });
    return null;
  }

  if (user.tentativasFalhas || user.bloqueadoAte) {
    await prisma.user.update({
      where: { id: user.id },
      data: { tentativasFalhas: 0, bloqueadoAte: null },
    });
  }
  return user;
}

export async function requireAuth(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, ativo: true },
  });
  if (!user?.ativo) return null;
  return session;
}
