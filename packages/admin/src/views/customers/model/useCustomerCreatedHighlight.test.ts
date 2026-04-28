import { describe, expect, it } from "vitest";
import { useCustomerCreatedHighlight } from "./useCustomerCreatedHighlight";

function createFakeTimers() {
  const pending: Array<{ cb: () => void; delay: number; id: number }> = [];
  let seq = 0;

  const fakeSetTimeout = ((cb: () => void, delay: number) => {
    seq += 1;
    pending.push({ cb, delay, id: seq });
    return seq;
  }) as unknown as typeof setTimeout;

  const fakeClearTimeout = ((id: number) => {
    const idx = pending.findIndex((item) => item.id === id);
    if (idx !== -1) pending.splice(idx, 1);
  }) as unknown as typeof clearTimeout;

  function flush() {
    const copy = [...pending];
    pending.length = 0;
    copy.forEach((item) => item.cb());
  }

  return { fakeSetTimeout, fakeClearTimeout, flush, pending };
}

describe("useCustomerCreatedHighlight", () => {
  it("starts without a highlighted customer", () => {
    const { fakeSetTimeout, fakeClearTimeout } = createFakeTimers();
    const highlight = useCustomerCreatedHighlight({
      setTimeoutFn: fakeSetTimeout,
      clearTimeoutFn: fakeClearTimeout,
    });

    expect(highlight.highlightedCustomerId.value).toBeNull();
  });

  it("stores the highlighted customer id immediately", () => {
    const { fakeSetTimeout, fakeClearTimeout } = createFakeTimers();
    const highlight = useCustomerCreatedHighlight({
      setTimeoutFn: fakeSetTimeout,
      clearTimeoutFn: fakeClearTimeout,
    });

    highlight.highlightCustomer("cust-new");

    expect(highlight.highlightedCustomerId.value).toBe("cust-new");
  });

  it("clears the highlight after the configured duration", () => {
    const { fakeSetTimeout, fakeClearTimeout, flush } = createFakeTimers();
    const highlight = useCustomerCreatedHighlight({
      duration: 5000,
      setTimeoutFn: fakeSetTimeout,
      clearTimeoutFn: fakeClearTimeout,
    });

    highlight.highlightCustomer("cust-new");
    expect(highlight.highlightedCustomerId.value).toBe("cust-new");

    flush();
    expect(highlight.highlightedCustomerId.value).toBeNull();
  });

  it("replaces the pending timer when a new customer is highlighted", () => {
    const { fakeSetTimeout, fakeClearTimeout, pending } = createFakeTimers();
    const highlight = useCustomerCreatedHighlight({
      setTimeoutFn: fakeSetTimeout,
      clearTimeoutFn: fakeClearTimeout,
    });

    highlight.highlightCustomer("cust-1");
    expect(pending).toHaveLength(1);

    highlight.highlightCustomer("cust-2");

    expect(pending).toHaveLength(1);
    expect(highlight.highlightedCustomerId.value).toBe("cust-2");
  });

  it("clearHighlight hides immediately and cancels the timer", () => {
    const { fakeSetTimeout, fakeClearTimeout, pending } = createFakeTimers();
    const highlight = useCustomerCreatedHighlight({
      setTimeoutFn: fakeSetTimeout,
      clearTimeoutFn: fakeClearTimeout,
    });

    highlight.highlightCustomer("cust-new");
    expect(pending).toHaveLength(1);

    highlight.clearHighlight();

    expect(highlight.highlightedCustomerId.value).toBeNull();
    expect(pending).toHaveLength(0);
  });
});
