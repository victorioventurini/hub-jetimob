/**
 * Tipos do módulo Análise — validação de contratos (compile-time + estrutura)
 */
import { describe, it, expect } from "vitest";
import type {
  AnalysisStatus,
  AnalysisMode,
  AnalysisDepth,
  AnalysisModule,
  AnalysisInsight,
  AnalysisSuggestedAction,
  AnalysisComposerState,
  GenerateAnalysisInput,
} from "./index";

describe("Tipos de Analysis — contratos canônicos", () => {
  it("AnalysisStatus aceita os 4 estados oficiais", () => {
    const valid: AnalysisStatus[] = ["pending", "generating", "complete", "failed"];
    expect(valid).toHaveLength(4);
  });

  it("AnalysisMode aceita auto/manual/mixed", () => {
    const valid: AnalysisMode[] = ["auto", "manual", "mixed"];
    expect(valid).toEqual(["auto", "manual", "mixed"]);
  });

  it("AnalysisDepth aceita auto/minimal/standard/full", () => {
    const valid: AnalysisDepth[] = ["auto", "minimal", "standard", "full"];
    expect(valid).toEqual(["auto", "minimal", "standard", "full"]);
  });

  it("AnalysisModule cobre os 6 módulos do Next", () => {
    const valid: AnalysisModule[] = [
      "kpis",
      "okrs",
      "projects",
      "initiatives",
      "checkins",
      "wizards",
    ];
    expect(valid).toHaveLength(6);
  });

  it("AnalysisInsight valida os 3 tipos visuais", () => {
    const insights: AnalysisInsight[] = [
      { type: "info", title: "i", body: "b" },
      { type: "warning", title: "w", body: "b" },
      { type: "positive", title: "p", body: "b" },
    ];
    expect(insights.map((i) => i.type)).toEqual(["info", "warning", "positive"]);
  });

  it("AnalysisSuggestedAction aceita shape canônico", () => {
    const a: AnalysisSuggestedAction = { type: "register_decision", label: "x", suggestedText: "y" };
    expect(a.label).toBe("x");
  });

  it("AnalysisComposerState exige campos canônicos", () => {
    const state: AnalysisComposerState = {
      premise: "p",
      additional_context: "",
      mode: "auto",
      modules: ["okrs"],
      scope: {},
      period: { start: "2024-01-01", end: "2024-03-31" },
      depth: "standard",
    };
    expect(state.modules).toContain("okrs");
  });

  it("GenerateAnalysisInput permite template_id e title opcionais", () => {
    const input: GenerateAnalysisInput = {
      premise: "p",
      mode: "auto",
      modules: ["okrs"],
      scope: {},
      period: { start: "2024-01-01", end: "2024-03-31" },
      depth: "standard",
      template_id: "tpl-1",
      title: "Análise X",
    };
    expect(input.template_id).toBe("tpl-1");
    expect(input.title).toBe("Análise X");
  });
});
