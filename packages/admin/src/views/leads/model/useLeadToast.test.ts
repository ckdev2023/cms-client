import { describe, expect, it, vi } from "vitest";
import { useLeadToast } from "./useLeadToast";

function createFakeTimers() {
  const pending: Array<{ cb: () => void; delay: number; id: number }> = [];
  let seq = 0;

  const fakeSetTimeout = ((cb: () => void, delay: number) => {
    seq += 1;
    pending.push({ cb, delay, id: seq });
    return seq;
  }) as unknown as typeof setTimeout;

  const fakeClearTimeout = ((id: number) => {
    const idx = pending.findIndex((p) => p.id === id);
    if (idx !== -1) pending.splice(idx, 1);
  }) as unknown as typeof clearTimeout;

  function flush() {
    const copy = [...pending];
    pending.length = 0;
    copy.forEach((p) => p.cb());
  }

  return { fakeSetTimeout, fakeClearTimeout, flush, pending };
}

describe("useLeadToast", () => {
  it("starts hidden", () => {
    const { fakeSetTimeout, fakeClearTimeout } = createFakeTimers();
    const toast = useLeadToast({
      setTimeoutFn: fakeSetTimeout,
      clearTimeoutFn: fakeClearTimeout,
    });

    expect(toast.visible.value).toBe(false);
    expect(toast.title.value).toBe("");
    expect(toast.description.value).toBe("");
  });

  it("shows toast with provided payload", () => {
    const { fakeSetTimeout, fakeClearTimeout } = createFakeTimers();
    const toast = useLeadToast({
      setTimeoutFn: fakeSetTimeout,
      clearTimeoutFn: fakeClearTimeout,
    });

    toast.show({ title: "Hello", description: "World" });

    expect(toast.visible.value).toBe(true);
    expect(toast.title.value).toBe("Hello");
    expect(toast.description.value).toBe("World");
  });

  it("auto-hides after the configured duration", () => {
    const { fakeSetTimeout, fakeClearTimeout, flush } = createFakeTimers();
    const toast = useLeadToast({
      duration: 2000,
      setTimeoutFn: fakeSetTimeout,
      clearTimeoutFn: fakeClearTimeout,
    });

    toast.show({ title: "T", description: "D" });
    expect(toast.visible.value).toBe(true);

    flush();
    expect(toast.visible.value).toBe(false);
  });

  it("replaces the current toast when show is called again", () => {
    const { fakeSetTimeout, fakeClearTimeout, pending } = createFakeTimers();
    const toast = useLeadToast({
      setTimeoutFn: fakeSetTimeout,
      clearTimeoutFn: fakeClearTimeout,
    });

    toast.show({ title: "First", description: "1" });
    expect(pending.length).toBe(1);

    toast.show({ title: "Second", description: "2" });
    expect(pending.length).toBe(1);
    expect(toast.title.value).toBe("Second");
  });

  it("hide() cancels the timer and hides immediately", () => {
    const { fakeSetTimeout, fakeClearTimeout, pending } = createFakeTimers();
    const toast = useLeadToast({
      setTimeoutFn: fakeSetTimeout,
      clearTimeoutFn: fakeClearTimeout,
    });

    toast.show({ title: "X", description: "Y" });
    expect(pending.length).toBe(1);

    toast.hide();
    expect(toast.visible.value).toBe(false);
    expect(pending.length).toBe(0);
  });

  it("uses real timers by default", () => {
    vi.useFakeTimers();
    try {
      const toast = useLeadToast({ duration: 500 });
      toast.show({ title: "A", description: "B" });
      expect(toast.visible.value).toBe(true);

      vi.advanceTimersByTime(600);
      expect(toast.visible.value).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
