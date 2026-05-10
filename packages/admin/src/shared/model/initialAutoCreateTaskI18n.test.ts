import { describe, expect, it } from "vitest";
import { resolveInitialAutoCreateTaskTitleKey } from "./initialAutoCreateTaskI18n";

describe("resolveInitialAutoCreateTaskTitleKey", () => {
  it("returns undefined when sourceType is not auto_create", () => {
    expect(
      resolveInitialAutoCreateTaskTitleKey("manual", "document_follow_up"),
    ).toBeUndefined();
  });

  it("maps document_follow_up + auto_create", () => {
    expect(
      resolveInitialAutoCreateTaskTitleKey("auto_create", "document_follow_up"),
    ).toBe("cases.detail.tasks.initial.documentFollowUp");
  });

  it("maps client_contact + auto_create", () => {
    expect(
      resolveInitialAutoCreateTaskTitleKey("auto_create", "client_contact"),
    ).toBe("cases.detail.tasks.initial.clientContact");
  });

  it("returns undefined for unknown taskType under auto_create", () => {
    expect(
      resolveInitialAutoCreateTaskTitleKey("auto_create", "general"),
    ).toBeUndefined();
  });
});
