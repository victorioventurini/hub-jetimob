import { describe, it, expect } from "vitest";
import { registerSsoHandoffAttempt, resetSsoHandoffAttempts } from "./ssoHandoff";
import { isAllowedSsoUrl } from "./authRedirect";

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe("registerSsoHandoffAttempt", () => {
  it("permite 2 retornos em 1 minuto e bloqueia o terceiro", () => {
    const s = memoryStorage();
    expect(registerSsoHandoffAttempt("comercial.jetimob.com", s, 0)).toBe(true);
    expect(registerSsoHandoffAttempt("comercial.jetimob.com", s, 10_000)).toBe(true);
    expect(registerSsoHandoffAttempt("comercial.jetimob.com", s, 20_000)).toBe(false);
  });

  it("libera de novo depois de 1 minuto", () => {
    const s = memoryStorage();
    registerSsoHandoffAttempt("comercial.jetimob.com", s, 0);
    registerSsoHandoffAttempt("comercial.jetimob.com", s, 1_000);
    expect(registerSsoHandoffAttempt("comercial.jetimob.com", s, 61_001)).toBe(true);
  });

  it("reset libera o botão 'tentar de novo'", () => {
    const s = memoryStorage();
    registerSsoHandoffAttempt("comercial.jetimob.com", s, 0);
    registerSsoHandoffAttempt("comercial.jetimob.com", s, 1);
    resetSsoHandoffAttempts("comercial.jetimob.com", s);
    expect(registerSsoHandoffAttempt("comercial.jetimob.com", s, 2)).toBe(true);
  });
});

describe("destino do handoff", () => {
  it("aceita comercial.jetimob.com em HTTPS", () => {
    expect(isAllowedSsoUrl("https://comercial.jetimob.com/painel")).toBe(true);
  });
  it("recusa outros domínios e http", () => {
    expect(isAllowedSsoUrl("https://evil.com/painel")).toBe(false);
    expect(isAllowedSsoUrl("https://jetimob.com.evil.com/")).toBe(false);
    expect(isAllowedSsoUrl("http://comercial.jetimob.com/painel")).toBe(false);
  });
});
