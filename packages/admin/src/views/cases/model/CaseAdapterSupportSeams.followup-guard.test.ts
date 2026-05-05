// ── Test Ownership ──────────────────────────────────────────────
// Owner: bug-doc-followup-guard — 案件资料 Tab 内"催办"按钮显隐与
//   服务端 `documentItems.followUp` 守卫的对齐回归。
// Bug: pending + category=standard 时前端渲染了"催办"按钮但服务端
//   返回 400（仅 waiting_upload / revision_required 可催办；
//   pending 仅 questionnaire 例外）。
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDocumentGroups } from "./CaseAdapterSupportSeams";

function docItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "di-fg01",
    name: "パスポート写し",
    status: "pending",
    ownerSide: "applicant",
    checklistItemCode: "DOC-001",
    dueAt: null,
    ...overrides,
  };
}

function actionsFor(extra: Record<string, unknown>) {
  const result = adaptCaseDocumentGroups({ items: [docItem(extra)] })!;
  return result[0].items[0].actions!;
}

describe("documents tab — follow-up button guard alignment", () => {
  it("pending + standard → canRemind=false (server rejects this combo)", () => {
    expect(
      actionsFor({ status: "pending", category: "standard" }).canRemind,
    ).toBe(false);
  });

  it("pending + (no category) → canRemind=false (treat as standard)", () => {
    expect(actionsFor({ status: "pending" }).canRemind).toBe(false);
  });

  it("pending + questionnaire → canRemind=true (server allows)", () => {
    expect(
      actionsFor({ status: "pending", category: "questionnaire" }).canRemind,
    ).toBe(true);
  });

  it("waiting_upload → canRemind=true regardless of category", () => {
    expect(actionsFor({ status: "waiting_upload" }).canRemind).toBe(true);
    expect(
      actionsFor({ status: "waiting_upload", category: "standard" }).canRemind,
    ).toBe(true);
  });

  it("revision_required → canRemind=true regardless of category", () => {
    expect(actionsFor({ status: "revision_required" }).canRemind).toBe(true);
  });

  it("approved / waived / expired / uploaded_reviewing → canRemind=false", () => {
    for (const status of [
      "approved",
      "waived",
      "expired",
      "uploaded_reviewing",
    ]) {
      expect(actionsFor({ status }).canRemind).toBe(false);
    }
  });

  it("threads category through to DocumentItem (consumed by row template)", () => {
    const result = adaptCaseDocumentGroups({
      items: [docItem({ status: "pending", category: "questionnaire" })],
    })!;
    const item = result[0].items[0];
    expect(item.backendStatus).toBe("pending");
    expect(item.category).toBe("questionnaire");
  });
});
