import { describe, it, expect } from "vitest";
import { normalizeCpf, formatCpf, isValidCpf, maskCpfInput, cpfZodSchema } from "./cpf";

describe("cpf utils", () => {
  it("normalizeCpf strips non-digits", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
    expect(normalizeCpf(null)).toBe("");
  });

  it("formatCpf applies mask when 11 digits", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(formatCpf("123")).toBe("123");
  });

  it("isValidCpf accepts known valid CPFs", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("11144477735")).toBe(true);
  });

  it("isValidCpf rejects invalid checksums and repeated sequences", () => {
    expect(isValidCpf("12345678900")).toBe(false);
    expect(isValidCpf("00000000000")).toBe(false);
    expect(isValidCpf("11111111111")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
    expect(isValidCpf("")).toBe(false);
  });

  it("maskCpfInput formats progressively", () => {
    expect(maskCpfInput("529")).toBe("529");
    expect(maskCpfInput("529982")).toBe("529.982");
    expect(maskCpfInput("529982247")).toBe("529.982.247");
    expect(maskCpfInput("52998224725")).toBe("529.982.247-25");
    expect(maskCpfInput("5299822472599")).toBe("529.982.247-25");
  });

  it("cpfZodSchema returns 11 digits and rejects invalid", () => {
    expect(cpfZodSchema.parse("529.982.247-25")).toBe("52998224725");
    expect(() => cpfZodSchema.parse("123")).toThrow();
    expect(() => cpfZodSchema.parse("12345678900")).toThrow();
  });
});
