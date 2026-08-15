import bcrypt from "bcryptjs";
import { getSession, type SessionData } from "@/lib/session";

let cachedHash: string | null = null;

async function getBarberPasswordHash(): Promise<string> {
  if (!cachedHash) {
    cachedHash = await bcrypt.hash(process.env.BARBER_PASSWORD!, 10);
  }
  return cachedHash;
}

export async function verifyBarberCredentials(
  email: string,
  password: string,
): Promise<boolean> {
  const expected = process.env.BARBER_EMAIL?.toLowerCase();
  if (!expected || email.toLowerCase() !== expected) return false;
  if (!password) return false;
  const hash = await getBarberPasswordHash();
  return bcrypt.compare(password, hash);
}

export async function requireAuth(): Promise<SessionData | null> {
  const session = await getSession();
  return session.email ? session : null;
}
