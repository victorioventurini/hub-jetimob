import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDialogFormReset } from "./useDialogFormReset";

describe("useDialogFormReset", () => {
  it("calls onOpen when transitioning closed -> open", () => {
    const onOpen = vi.fn();
    const { rerender } = renderHook(
      ({ open }: { open: boolean }) => useDialogFormReset(open, onOpen),
      { initialProps: { open: false } }
    );

    expect(onOpen).not.toHaveBeenCalled();

    rerender({ open: true });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("does NOT re-fire when callback identity changes while open stays true", () => {
    const onOpenA = vi.fn();
    const onOpenB = vi.fn();
    const { rerender } = renderHook(
      ({ open, cb }: { open: boolean; cb: () => void }) =>
        useDialogFormReset(open, cb),
      { initialProps: { open: false, cb: onOpenA } }
    );

    rerender({ open: true, cb: onOpenA });
    expect(onOpenA).toHaveBeenCalledTimes(1);

    // Stay open, swap callback — should NOT trigger
    rerender({ open: true, cb: onOpenB });
    expect(onOpenA).toHaveBeenCalledTimes(1);
    expect(onOpenB).not.toHaveBeenCalled();
  });

  it("fires again on subsequent open transitions", () => {
    const onOpen = vi.fn();
    const { rerender } = renderHook(
      ({ open }: { open: boolean }) => useDialogFormReset(open, onOpen),
      { initialProps: { open: false } }
    );

    rerender({ open: true });
    rerender({ open: false });
    rerender({ open: true });

    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("does not fire when initial open is true (no transition observed)", () => {
    // Initial render with open=true: prevOpen starts as true, so first effect
    // sees open=true && !prevOpenRef.current === false → no call.
    const onOpen = vi.fn();
    renderHook(() => useDialogFormReset(true, onOpen));
    expect(onOpen).not.toHaveBeenCalled();
  });
});
