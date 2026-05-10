import { describe, expect, it } from "vitest";
import { adaptCaseTaskList } from "./CaseAdapterSupportSeams";

type R = Record<string, unknown>;

const taskDto = (overrides: R = {}): R => ({
  id: "task-f01",
  title: "dummy",
  status: "pending",
  taskType: "document_follow_up",
  sourceType: null,
  priority: "normal",
  ...overrides,
});

describe("adaptCaseTaskList initial auto_create i18n keys", () => {
  it("auto_create initial tasks expose labelI18nKey for locale display", () => {
    const result = adaptCaseTaskList({
      items: [
        taskDto({
          title: "顧客に基礎資料のアップロードを依頼",
          taskType: "document_follow_up",
          sourceType: "auto_create",
        }),
        taskDto({
          id: "task-2",
          title: "顧客との初回面談を確認",
          taskType: "client_contact",
          sourceType: "auto_create",
        }),
      ],
    })!;
    expect(result[0].labelI18nKey).toBe(
      "cases.detail.tasks.initial.documentFollowUp",
    );
    expect(result[1].labelI18nKey).toBe(
      "cases.detail.tasks.initial.clientContact",
    );
  });

  it("snake_case task_type/source_type resolves labelI18nKey", () => {
    const result = adaptCaseTaskList({
      items: [
        {
          id: "t-snake",
          title: "顧客との初回面談を確認",
          status: "pending",
          task_type: "client_contact",
          source_type: "auto_create",
          priority: "normal",
        },
      ],
    })!;
    expect(result[0].labelI18nKey).toBe(
      "cases.detail.tasks.initial.clientContact",
    );
  });

  it("non-auto_create keeps labelI18nKey undefined", () => {
    const result = adaptCaseTaskList({
      items: [
        taskDto({
          title: "顧客に基礎資料のアップロードを依頼",
          taskType: "document_follow_up",
          sourceType: null,
        }),
      ],
    })!;
    expect(result[0].labelI18nKey).toBeUndefined();
  });
});
