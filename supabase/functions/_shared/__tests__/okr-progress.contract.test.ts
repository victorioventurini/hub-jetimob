/**
 * Contract tests para o canon de progresso de KR usado nas edge functions.
 * Espelha src/modules/okrs/utils/__tests__/progressCalculation.contract.test.ts.
 *
 * Roda no mesmo runner (vitest) — funções são puras, sem dependências de Deno.
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error — edge function path resolvido pelo vitest via alias relativo.
import { calculateKrProgress } from "../okr-progress.ts";

describe("_shared/okr-progress — contract (edge)", () => {
  it("normaliza unidade quando current foi digitado em escala diferente do target (regressão 17706%)", () => {
    const progress = calculateKrProgress(0, 70_822, 400, "up", "R$ mil");
    expect(progress).toBeLessThan(1000);
    expect(progress).toBeCloseTo(17.7055, 2);
  });

  it("direction='maintain' é binário", () => {
    expect(calculateKrProgress(75, 75, 75, "maintain")).toBe(100);
    expect(calculateKrProgress(75, 70, 75, "maintain")).toBe(0);
  });

  it("permite over-achievement (>100%) sem clamp", () => {
    expect(calculateKrProgress(0, 163, 100, "up")).toBeCloseTo(163, 5);
  });

  it("target === baseline degrada para binário", () => {
    expect(calculateKrProgress(50, 50, 50, "up")).toBe(100);
    expect(calculateKrProgress(50, 49, 50, "up")).toBe(0);
  });

  it("piso em 0 (nunca negativo)", () => {
    expect(calculateKrProgress(0, -50, 100, "up")).toBe(0);
  });

  describe("direction='down' com baseline ≤ target (KR-cap)", () => {
    it("current abaixo do teto → 100% (caso MRR churn)", () => {
      expect(calculateKrProgress(0, 6389.23, 6700, "down")).toBe(100);
    });
    it("current igual ao teto → 100%", () => {
      expect(calculateKrProgress(0, 6700, 6700, "down")).toBe(100);
    });
    it("current acima do teto → penalidade suave (target/current)", () => {
      expect(calculateKrProgress(0, 7370, 6700, "down")).toBeCloseTo(90.909, 2);
    });
    it("redução clássica (baseline > target) preserva fórmula linear", () => {
      expect(calculateKrProgress(10000, 6389.23, 6700, "down")).toBeCloseTo(109.42, 1);
    });
  });
});

