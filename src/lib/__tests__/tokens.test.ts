import { describe, expect, it } from "vitest";
import { criarToken, hashToken } from "@/lib/tokens";

describe("tokens públicos", () => {
  it("guarda apenas um hash determinístico do token aleatório", () => {
    const primeiro = criarToken();
    const segundo = criarToken();
    expect(primeiro.token).not.toBe(segundo.token);
    expect(primeiro.hash).toBe(hashToken(primeiro.token));
    expect(primeiro.hash).not.toContain(primeiro.token);
  });
});
