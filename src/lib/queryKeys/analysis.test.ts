/**
 * analysisKeys — testes unitários das query keys do módulo Análise
 */
import { describe, it, expect } from "vitest";
import { analysisKeys } from "./analysis";

describe("analysisKeys — prefix helpers", () => {
  it("allPrefix retorna o namespace raiz", () => {
    expect(analysisKeys.allPrefix()).toEqual(["analysis"]);
  });

  it("listPrefix retorna o prefixo de listagem", () => {
    expect(analysisKeys.listPrefix()).toEqual(["analysis", "list"]);
  });

  it("templatesPrefix retorna o prefixo de templates", () => {
    expect(analysisKeys.templatesPrefix()).toEqual(["analysis", "templates"]);
  });
});

describe("analysisKeys — chaves específicas", () => {
  it("list inclui bu_id e filtros", () => {
    const filters = { status: "complete" };
    expect(analysisKeys.list("bu-1", filters)).toEqual([
      "analysis",
      "list",
      "bu-1",
      filters,
    ]);
  });

  it("list aceita bu_id null (estado de carregamento)", () => {
    expect(analysisKeys.list(null)).toEqual([
      "analysis",
      "list",
      null,
      undefined,
    ]);
  });

  it("detail é determinístico por id", () => {
    expect(analysisKeys.detail("rep-1")).toEqual(["analysis", "detail", "rep-1"]);
  });

  it("templates inclui bu_id", () => {
    expect(analysisKeys.templates("bu-1")).toEqual([
      "analysis",
      "templates",
      "bu-1",
    ]);
  });

  it("feedback / comments / shareLog são derivados do reportId", () => {
    expect(analysisKeys.feedback("rep-1")).toEqual([
      "analysis",
      "feedback",
      "rep-1",
    ]);
    expect(analysisKeys.comments("rep-1")).toEqual([
      "analysis",
      "comments",
      "rep-1",
    ]);
    expect(analysisKeys.shareLog("rep-1")).toEqual([
      "analysis",
      "share-log",
      "rep-1",
    ]);
  });

  it("chaves específicas começam com seus respectivos prefixos (cache invalidation)", () => {
    const list = analysisKeys.list("bu-1", { x: 1 });
    const tpl = analysisKeys.templates("bu-1");
    expect(list.slice(0, 2)).toEqual(analysisKeys.listPrefix());
    expect(tpl.slice(0, 2)).toEqual(analysisKeys.templatesPrefix());
    expect(list[0]).toBe(analysisKeys.allPrefix()[0]);
  });
});
