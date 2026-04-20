import { describe, it, expect } from "vitest";
import { tryParseAiJson, stripJsonNoise } from "./aiResponseParser";

describe("stripJsonNoise", () => {
  it("remove fence markdown json", () => {
    expect(stripJsonNoise('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("remove fence sem linguagem", () => {
    expect(stripJsonNoise("```\n[1,2]\n```")).toBe("[1,2]");
  });
  it("remove trailing comma", () => {
    expect(stripJsonNoise('{"a":1,}')).toBe('{"a":1}');
  });
  it("recorta texto antes/depois do bloco", () => {
    const raw = 'Aqui está: {"a":1} — fim.';
    expect(stripJsonNoise(raw)).toBe('{"a":1}');
  });
});

describe("tryParseAiJson", () => {
  it("parseia JSON puro", () => {
    expect(tryParseAiJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });
  it("parseia dentro de fence markdown", () => {
    const raw = "Resposta:\n```json\n{\"type\":\"warning\",\"alternatives\":[\"a\",\"b\",\"c\"]}\n```\nObservação adicional.";
    const parsed = tryParseAiJson<any>(raw);
    expect(parsed?.type).toBe("warning");
    expect(parsed?.alternatives).toHaveLength(3);
  });
  it("parseia com prefixo e sufixo livres", () => {
    const raw = 'Aqui está minha análise: {"type":"success","message":"ok","alternatives":[]} — fim.';
    const parsed = tryParseAiJson<any>(raw);
    expect(parsed?.type).toBe("success");
  });
  it("salvaga bloco balanceado em meio a texto", () => {
    const raw = 'Texto livre {"chave":"valor com } interno em string"} mais texto.';
    const parsed = tryParseAiJson<any>(raw);
    expect(parsed?.chave).toContain("valor");
  });
  it("retorna null quando não há JSON", () => {
    expect(tryParseAiJson("apenas texto livre sem json")).toBeNull();
  });
  it("retorna null para entrada vazia", () => {
    expect(tryParseAiJson("")).toBeNull();
    expect(tryParseAiJson(null)).toBeNull();
    expect(tryParseAiJson(undefined)).toBeNull();
  });
});
