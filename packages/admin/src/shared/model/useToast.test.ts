import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createToastController,
  initToast,
  useToast,
  resetToast,
} from "./useToast";

beforeEach(() => {
  resetToast();
});

describe("createToastController", () => {
  it("starts with an empty queue", () => {
    const ctrl = createToastController({ scheduleRemoval: () => {} });
    expect(ctrl.items.value).toEqual([]);
  });

  it("adds a toast with defaults (tone=success, durationMs=4000)", () => {
    const ctrl = createToastController({ scheduleRemoval: () => {} });
    const id = ctrl.add({ title: "Saved" });

    expect(ctrl.items.value).toHaveLength(1);
    expect(ctrl.items.value[0]).toMatchObject({
      id,
      title: "Saved",
      tone: "success",
      durationMs: 4000,
    });
  });

  it("accepts custom tone and duration", () => {
    const ctrl = createToastController({ scheduleRemoval: () => {} });
    ctrl.add({ title: "Error", tone: "error", durationMs: 8000 });

    expect(ctrl.items.value[0]).toMatchObject({
      tone: "error",
      durationMs: 8000,
    });
  });

  it("includes optional description", () => {
    const ctrl = createToastController({ scheduleRemoval: () => {} });
    ctrl.add({ title: "T", description: "Details here" });

    expect(ctrl.items.value[0]!.description).toBe("Details here");
  });

  it("dismiss removes the matching toast", () => {
    const ctrl = createToastController({ scheduleRemoval: () => {} });
    const id1 = ctrl.add({ title: "A" });
    const id2 = ctrl.add({ title: "B" });

    ctrl.dismiss(id1);
    expect(ctrl.items.value).toHaveLength(1);
    expect(ctrl.items.value[0]!.id).toBe(id2);
  });

  it("dismiss is a no-op for unknown id", () => {
    const ctrl = createToastController({ scheduleRemoval: () => {} });
    ctrl.add({ title: "A" });
    ctrl.dismiss("nonexistent");
    expect(ctrl.items.value).toHaveLength(1);
  });

  it("schedules auto-removal via the injected callback", () => {
    const scheduled: Array<{ id: string; ms: number }> = [];
    const ctrl = createToastController({
      scheduleRemoval: (id, ms) => scheduled.push({ id, ms }),
    });

    const id = ctrl.add({ title: "X", durationMs: 2000 });
    expect(scheduled).toEqual([{ id, ms: 2000 }]);
  });

  it("auto-dismisses after durationMs using real timers", () => {
    vi.useFakeTimers();
    try {
      const ctrl = createToastController();
      ctrl.add({ title: "Gone soon", durationMs: 3000 });

      expect(ctrl.items.value).toHaveLength(1);
      vi.advanceTimersByTime(3000);
      expect(ctrl.items.value).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("maintains FIFO order when multiple toasts are added", () => {
    const ctrl = createToastController({ scheduleRemoval: () => {} });
    ctrl.add({ title: "First" });
    ctrl.add({ title: "Second" });
    ctrl.add({ title: "Third" });

    const titles = ctrl.items.value.map((t) => t.title);
    expect(titles).toEqual(["First", "Second", "Third"]);
  });

  it("generates unique IDs across calls", () => {
    const ctrl = createToastController({ scheduleRemoval: () => {} });
    const id1 = ctrl.add({ title: "A" });
    const id2 = ctrl.add({ title: "B" });
    expect(id1).not.toBe(id2);
  });
});

describe("initToast / useToast singleton", () => {
  it("throws when useToast called before init", () => {
    expect(() => useToast()).toThrow("useToast() called before");
  });

  it("returns singleton after init", () => {
    const inst = initToast();
    const result = useToast();
    expect(result).toBe(inst);
  });

  it("resetToast clears singleton", () => {
    initToast();
    resetToast();
    expect(() => useToast()).toThrow();
  });
});
