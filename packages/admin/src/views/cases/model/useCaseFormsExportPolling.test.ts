import { describe, it, expect } from "vitest";
import {
  createPollingStateMachine,
  hasExportingDocs,
  type ExportPollingState,
} from "./useCaseFormsExportPolling";
import type { CaseDetail } from "../types-detail";

function makeForms(statuses: string[]): CaseDetail["forms"] {
  return {
    templates: [],
    generated: statuses.map((backendStatus, i) => ({
      id: `doc-${String(i)}`,
      name: `Doc ${String(i)}`,
      meta: "",
      tone: "primary",
      backendStatus: backendStatus as never,
      fileUrl: null,
      fileUrlIsPlaceholder: false,
      approvedBy: null,
      approvedAt: null,
    })),
  };
}

describe("hasExportingDocs", () => {
  it("returns false for undefined forms", () => {
    expect(hasExportingDocs(undefined)).toBe(false);
  });

  it("returns false when no docs are exporting", () => {
    expect(hasExportingDocs(makeForms(["draft", "exported"]))).toBe(false);
  });

  it("returns true when at least one doc is exporting", () => {
    expect(hasExportingDocs(makeForms(["draft", "exporting"]))).toBe(true);
  });
});

describe("createPollingStateMachine", () => {
  it("initializes with polling=false", () => {
    const m = createPollingStateMachine();
    expect(m.getState()).toEqual<ExportPollingState>({
      polling: false,
      pollCount: 0,
      timedOut: false,
    });
  });

  it("start() sets polling=true and resets count", () => {
    const m = createPollingStateMachine();
    const s = m.start();
    expect(s.polling).toBe(true);
    expect(s.pollCount).toBe(0);
    expect(s.timedOut).toBe(false);
  });

  it("tick() increments pollCount", () => {
    const m = createPollingStateMachine();
    m.start();
    const s1 = m.tick();
    expect(s1.pollCount).toBe(1);
    expect(s1.polling).toBe(true);

    const s2 = m.tick();
    expect(s2.pollCount).toBe(2);
  });

  it("tick() is noop when not polling", () => {
    const m = createPollingStateMachine();
    const s = m.tick();
    expect(s.pollCount).toBe(0);
    expect(s.polling).toBe(false);
  });

  it("tick() times out at 60 polls", () => {
    const m = createPollingStateMachine();
    m.start();

    let state: ExportPollingState = m.getState();
    for (let i = 0; i < 59; i++) {
      state = m.tick();
    }
    expect(state.polling).toBe(true);
    expect(state.pollCount).toBe(59);
    expect(state.timedOut).toBe(false);

    state = m.tick();
    expect(state.polling).toBe(false);
    expect(state.pollCount).toBe(60);
    expect(state.timedOut).toBe(true);
  });

  it("stop() halts polling without resetting count", () => {
    const m = createPollingStateMachine();
    m.start();
    m.tick();
    m.tick();
    const s = m.stop();
    expect(s.polling).toBe(false);
    expect(s.pollCount).toBe(2);
    expect(s.timedOut).toBe(false);
  });

  it("reset() returns to initial state", () => {
    const m = createPollingStateMachine();
    m.start();
    m.tick();
    const s = m.reset();
    expect(s).toEqual<ExportPollingState>({
      polling: false,
      pollCount: 0,
      timedOut: false,
    });
  });
});
