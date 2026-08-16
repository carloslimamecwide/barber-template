import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { serverEnv } from "@/lib/env";

export type SessionData = {
  userId?: string;
  email?: string;
};

export const sessionOptions: SessionOptions = {
  password: serverEnv.sessionSecret,
  cookieName: "barbearia_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return Boolean(session.userId);
}
