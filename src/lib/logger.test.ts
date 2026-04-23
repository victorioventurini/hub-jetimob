import { describe, it, expect } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  it("exposes the standard set of methods", () => {
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.log).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("warn and error always write to console (not no-op)", () => {
    // Bound console methods stringify as "function warn() { [native code] }"
    // — important is that they are NOT the local noop().
    expect(logger.warn.name).not.toBe("noop");
    expect(logger.error.name).not.toBe("noop");
  });

  it("never throws when invoked with payloads", () => {
    expect(() => logger.warn("[test] warn", { a: 1 })).not.toThrow();
    expect(() => logger.error("[test] error", new Error("x"))).not.toThrow();
    expect(() => logger.debug("[test] debug")).not.toThrow();
    expect(() => logger.info("[test] info")).not.toThrow();
    expect(() => logger.log("[test] log")).not.toThrow();
  });
});
