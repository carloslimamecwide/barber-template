type RequestOriginContext = {
  headers: Pick<Headers, "get">;
  nextUrl: { origin: string };
};

function normalizarOrigem(valor: string | null | undefined) {
  if (!valor) return null;
  try {
    return new URL(valor).origin;
  } catch {
    return null;
  }
}

function primeiroValor(valor: string | null) {
  return valor?.split(",")[0]?.trim() || null;
}

export function origemMutacaoPermitida(
  request: RequestOriginContext,
  originHeader: string,
  appUrl = process.env.NEXT_PUBLIC_APP_URL,
) {
  const origem = normalizarOrigem(originHeader);
  if (!origem) return false;

  const permitidas = new Set<string>();
  const origemConfigurada = normalizarOrigem(appUrl);
  const origemNext = normalizarOrigem(request.nextUrl.origin);
  if (origemConfigurada) permitidas.add(origemConfigurada);
  if (origemNext) permitidas.add(origemNext);

  const host = primeiroValor(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  const protocolo = primeiroValor(request.headers.get("x-forwarded-proto"));
  if (host && (protocolo === "http" || protocolo === "https")) {
    permitidas.add(`${protocolo}://${host}`);
  }

  return permitidas.has(origem);
}
