import { describe, expect, it } from "vitest";
import {
  WAIVE_ALLOWED_FROM_STATUSES,
  WAIVE_ALLOWED_FROM_STATUSES_SET,
} from "./fixtures-waive-contract";
import { STATUS_TRANSITIONS } from "./constants";
import type { DocumentItemStatus } from "./types";

/**
 * 后端 `WAIVE_ALLOWED_FROM_STATUSES` 的值集快照。
 *
 * 权威来源: `packages/server/src/modules/core/documents.types.ts`
 * 若后端变更，此快照应同步更新；测试失败即意味着前后端脱节。
 */
const BACKEND_WAIVE_ALLOWED_SNAPSHOT: readonly string[] = [
  "pending",
  "waiting_upload",
  "revision_required",
  "approved",
  "expired",
];

describe("waive contract — frontend ↔ backend alignment", () => {
  it("frontend fixture matches backend WAIVE_ALLOWED_FROM_STATUSES snapshot", () => {
    const frontendSet = new Set(WAIVE_ALLOWED_FROM_STATUSES);
    const backendSet = new Set(BACKEND_WAIVE_ALLOWED_SNAPSHOT);

    const missingInFrontend = BACKEND_WAIVE_ALLOWED_SNAPSHOT.filter(
      (s) => !frontendSet.has(s),
    );
    const extraInFrontend = [...WAIVE_ALLOWED_FROM_STATUSES].filter(
      (s) => !backendSet.has(s),
    );

    expect(missingInFrontend).toEqual([]);
    expect(extraInFrontend).toEqual([]);
    expect([...WAIVE_ALLOWED_FROM_STATUSES].sort()).toEqual(
      [...BACKEND_WAIVE_ALLOWED_SNAPSHOT].sort(),
    );
  });

  it("STATUS_TRANSITIONS does not include waived as a target (waive goes through dedicated endpoint)", () => {
    const allStatuses = Object.keys(STATUS_TRANSITIONS) as DocumentItemStatus[];
    for (const from of allStatuses) {
      const targets = STATUS_TRANSITIONS[from];
      expect(targets).not.toContain("waived");
    }
  });

  it("WAIVE_ALLOWED_FROM_STATUSES_SET is consistent with the array", () => {
    expect(WAIVE_ALLOWED_FROM_STATUSES_SET.size).toBe(
      WAIVE_ALLOWED_FROM_STATUSES.length,
    );
    for (const s of WAIVE_ALLOWED_FROM_STATUSES) {
      expect(WAIVE_ALLOWED_FROM_STATUSES_SET.has(s)).toBe(true);
    }
  });

  it("uploaded_reviewing is NOT in waive whitelist (backend rejects)", () => {
    expect(WAIVE_ALLOWED_FROM_STATUSES_SET.has("uploaded_reviewing")).toBe(
      false,
    );
  });

  it("waived is NOT in waive whitelist (already waived)", () => {
    expect(WAIVE_ALLOWED_FROM_STATUSES_SET.has("waived")).toBe(false);
  });
});
