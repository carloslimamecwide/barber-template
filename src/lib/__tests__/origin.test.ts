import { describe, expect, it } from "vitest";
import { origemMutacaoPermitida } from "@/lib/origin";

function pedido(headers: Record<string, string> = {}, origin = "http://app:3000") {
  return { headers: new Headers(headers), nextUrl: { origin } };
}

describe("validação da origem de mutações", () => {
  it("aceita a origem pública configurada mesmo que o Next veja o endereço interno", () => {
    expect(
      origemMutacaoPermitida(
        pedido(),
        "https://barber.webfusionlab.pt",
        "https://barber.webfusionlab.pt",
      ),
    ).toBe(true);
  });

  it("aceita a origem reconstruída pelos headers do reverse proxy", () => {
    expect(
      origemMutacaoPermitida(
        pedido({
          "x-forwarded-host": "barber.webfusionlab.pt",
          "x-forwarded-proto": "https",
        }),
        "https://barber.webfusionlab.pt",
        undefined,
      ),
    ).toBe(true);
  });

  it("usa apenas o primeiro valor encaminhado pelo proxy", () => {
    expect(
      origemMutacaoPermitida(
        pedido({
          "x-forwarded-host": "barber.webfusionlab.pt, app:3000",
          "x-forwarded-proto": "https, http",
        }),
        "https://barber.webfusionlab.pt",
        undefined,
      ),
    ).toBe(true);
  });

  it("rejeita uma origem externa", () => {
    expect(
      origemMutacaoPermitida(
        pedido({
          "x-forwarded-host": "barber.webfusionlab.pt",
          "x-forwarded-proto": "https",
        }),
        "https://atacante.example",
        "https://barber.webfusionlab.pt",
      ),
    ).toBe(false);
  });

  it("rejeita um header Origin inválido", () => {
    expect(origemMutacaoPermitida(pedido(), "origem inválida", undefined)).toBe(false);
  });
});
