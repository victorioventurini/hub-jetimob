/**
 * Contract tests para o canon de progresso de KR.
 *
 * Estes testes existem para travar regressões críticas:
 *   1. KR com `unit="R$ mil"` cujo `current_value` foi digitado em R$ cru
 *      NÃO pode explodir o % (regressão real: bug do 17706% no MBR Executive Report).
 *   2. `direction="maintain"` deve ser binário.
 *   3. Over-achievement (>100%) é permitido — sem clamp superior na função base.
 *   4. `target === baseline` deve degradar para binário sem dividir por zero.
 *
 * Qualquer alteração em `calculateProgress` que quebre algum destes contratos
 * exige discussão explícita (atualizar memória `mem://features/okrs/okrs-master-standard`).
 */

import { describe, expect, it } from "vitest";
import { calculateProgress } from "../progressCalculation";

describe("progressCalculation — contract", () => {
  it("normaliza unidade quando current foi digitado em escala diferente do target (regressão 17706%)", () => {
    // KR real: "Gerar um incremento de R$ 400 mil em MRR".
    // target=400 com unit="R$ mil"; current=70822 (digitado em R$ cru).
    // Sem normalização: 70822/400 * 100 = 17.705,5%. Com canon: ~17,7%.
    const progress = calculateProgress(0, 70_822, 400, "up", { unit: "R$ mil" });
    expect(progress).toBeLessThan(1000);
    expect(progress).toBeGreaterThan(10);
    expect(progress).toBeCloseTo(17.7055, 2);
  });

  it("respeita unidade quando current já está na mesma escala do target", () => {
    // baseline 0, current 250, target 400 (todos em "R$ mil") → 62,5%.
    const progress = calculateProgress(0, 250, 400, "up", { unit: "R$ mil" });
    expect(progress).toBeCloseTo(62.5, 5);
  });

  it("direction='maintain' é binário (atingiu meta → 100, caso contrário → 0)", () => {
    expect(calculateProgress(75, 75, 75, "maintain")).toBe(100);
    expect(calculateProgress(75, 80, 75, "maintain")).toBe(100);
    expect(calculateProgress(75, 70, 75, "maintain")).toBe(0);
  });

  it("permite over-achievement (>100%) sem clamp superior", () => {
    // baseline 0, current 163, target 100 → 163%.
    expect(calculateProgress(0, 163, 100, "up")).toBeCloseTo(163, 5);
  });

  it("target === baseline degrada para binário (sem divisão por zero)", () => {
    expect(calculateProgress(50, 50, 50, "up")).toBe(100);
    expect(calculateProgress(50, 49, 50, "up")).toBe(0);
    expect(calculateProgress(50, 50, 50, "down")).toBe(100);
    expect(calculateProgress(50, 51, 50, "down")).toBe(0);
  });

  it("direction='down' calcula redução corretamente", () => {
    // baseline 50, target 15, current 25 → (50-25)/(50-15)*100 ≈ 71,4%.
    expect(calculateProgress(50, 25, 15, "down")).toBeCloseTo(71.4286, 3);
  });

  it("nunca retorna valor negativo", () => {
    // baseline 0, current=-50, target=100 → piso 0%.
    expect(calculateProgress(0, -50, 100, "up")).toBe(0);
  });
});
