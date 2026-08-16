import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { origemMutacaoPermitida } from "@/lib/origin";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const origin = req.headers.get("origin");
  if (pathname.startsWith("/api/") && mutating && origin && !origemMutacaoPermitida(req, origin)) {
    return NextResponse.json(
      { error: { code: "INVALID_ORIGIN", message: "Origem do pedido inválida" } },
      { status: 403 },
    );
  }

  if (!pathname.startsWith("/dashboard")) {
    const response = NextResponse.next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return response;
  }

  const res = new NextResponse();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  if (!session.userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  const adminPaths = ["/dashboard/configuracao", "/dashboard/auditoria", "/dashboard/utilizadores"];
  const staffPaths = ["/dashboard/clientes", "/dashboard/profissionais", "/dashboard/servicos", "/dashboard/horarios", "/dashboard/recorrentes", "/dashboard/estatisticas", "/dashboard/notificacoes"];
  if ((adminPaths.some((path) => pathname.startsWith(path)) && session.role !== "admin") || (staffPaths.some((path) => pathname.startsWith(path)) && session.role === "profissional")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
