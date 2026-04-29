import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { useDocumentListModel } from "./useDocumentListModel";
import {
  DocumentRepositoryError,
  type DocumentRepository,
} from "./DocumentRepository";
import type { DocumentListItem } from "../types";

const API_ROW: DocumentListItem = {
  id: "doc-api-1",
  name: "API 行（live data）",
  caseId: "case-api-1",
  caseName: "经管签新规",
  provider: "main_applicant",
  status: "uploaded_reviewing",
  dueDate: "2026-05-10",
  dueDateLabel: "2026-05-10",
  lastReminderAt: null,
  lastReminderAtLabel: "—",
  relativePath: null,
  sharedExpiryRisk: false,
  referenceCount: 1,
};

function makeRepository(
  result: DocumentListItem[] | (() => Promise<DocumentListItem[]>),
): DocumentRepository {
  return {
    listDocuments: vi.fn(async () =>
      typeof result === "function" ? await result() : result,
    ),
  };
}

describe("useDocumentListModel (BUG-079)", () => {
  it("loads items from repository on mount", async () => {
    const repository = makeRepository([API_ROW]);
    const m = useDocumentListModel({ repository });
    await flushPromises();
    expect(repository.listDocuments).toHaveBeenCalledTimes(1);
    expect(m.items.value).toEqual([API_ROW]);
    expect(m.source.value).toBe("api");
    expect(m.errorCode.value).toBeNull();
  });

  it("falls back to fixtures when API returns empty", async () => {
    const repository = makeRepository([]);
    const m = useDocumentListModel({ repository });
    await flushPromises();
    expect(m.source.value).toBe("fallback");
    expect(m.items.value.length).toBeGreaterThan(0);
  });

  it("does not fall back when fallbackToFixturesWhenEmpty=false", async () => {
    const repository = makeRepository([]);
    const m = useDocumentListModel({
      repository,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(m.source.value).toBe("api");
    expect(m.items.value).toEqual([]);
  });

  it("maps UNAUTHORIZED into errorCode and keeps fixtures visible", async () => {
    const repository = makeRepository(async () => {
      throw new DocumentRepositoryError({
        code: "UNAUTHORIZED",
        message: "denied",
        status: 401,
      });
    });
    const m = useDocumentListModel({ repository });
    await flushPromises();
    expect(m.errorCode.value).toBe("unauthorized");
    expect(m.items.value.length).toBeGreaterThan(0);
    expect(m.source.value).toBe("fallback");
  });

  it("refresh re-runs the request", async () => {
    const repository = makeRepository([API_ROW]);
    const m = useDocumentListModel({ repository });
    await flushPromises();
    await m.refresh();
    expect(repository.listDocuments).toHaveBeenCalledTimes(2);
  });
});
