import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useSafeBack, useModuleBack } from "./useSafeBack";

const navigateMock = vi.fn();
const buMock = vi.fn(() => ({ buSelected: true }));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/contexts/BuContext", () => ({
  useBu: () => buMock(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("useSafeBack", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    buMock.mockReturnValue({ buSelected: true });
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: window.location.origin + "/some/page",
    });
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 5,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses history.back() when internal history + same origin", () => {
    const { result } = renderHook(() => useSafeBack({ moduleRoot: "/okrs" }), {
      wrapper,
    });
    act(() => result.current());
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it("falls back to moduleRoot when no internal history", () => {
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 1,
    });
    const { result } = renderHook(() => useSafeBack({ moduleRoot: "/okrs" }), {
      wrapper,
    });
    act(() => result.current());
    expect(navigateMock).toHaveBeenCalledWith("/okrs");
  });

  it("falls back to moduleRoot when referrer is external", () => {
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "https://google.com",
    });
    const { result } = renderHook(() => useSafeBack({ moduleRoot: "/tickets" }), {
      wrapper,
    });
    act(() => result.current());
    expect(navigateMock).toHaveBeenCalledWith("/tickets");
  });

  it("respects alwaysUseModuleRoot", () => {
    const { result } = renderHook(
      () => useSafeBack({ moduleRoot: "/okrs", alwaysUseModuleRoot: true }),
      { wrapper }
    );
    act(() => result.current());
    expect(navigateMock).toHaveBeenCalledWith("/okrs");
  });

  it("falls back to '/' when BU is selected and no moduleRoot", () => {
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 1,
    });
    const { result } = renderHook(() => useSafeBack(), { wrapper });
    act(() => result.current());
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("falls back to '/select-bu' when no BU is selected and no moduleRoot", () => {
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 1,
    });
    buMock.mockReturnValue({ buSelected: false });
    const { result } = renderHook(() => useSafeBack(), { wrapper });
    act(() => result.current());
    expect(navigateMock).toHaveBeenCalledWith("/select-bu");
  });

  it("respects custom fallback", () => {
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 1,
    });
    const { result } = renderHook(() => useSafeBack({ fallback: "/custom" }), {
      wrapper,
    });
    act(() => result.current());
    expect(navigateMock).toHaveBeenCalledWith("/custom");
  });
});

describe("useModuleBack", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    Object.defineProperty(window.history, "length", {
      configurable: true,
      value: 1,
    });
  });

  it("delegates to useSafeBack with given moduleRoot", () => {
    const { result } = renderHook(() => useModuleBack("/projects"), { wrapper });
    act(() => result.current());
    expect(navigateMock).toHaveBeenCalledWith("/projects");
  });
});
