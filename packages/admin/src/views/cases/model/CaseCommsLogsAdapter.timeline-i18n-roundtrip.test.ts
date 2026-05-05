import { describe, it, expect } from "vitest";
import { createI18n } from "vue-i18n";
import { adaptCaseLogDto } from "./CaseCommsLogsAdapter";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const MESSAGES = {
  "ja-JP": { cases: casesJaJP },
  "zh-CN": { cases: casesZhCN },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale: "ja-JP" | "zh-CN" | "en-US") {
  return createI18n({ legacy: false, locale, messages: MESSAGES });
}

function makeLogDto(action: string, payload: Record<string, unknown>) {
  return {
    id: "log-r39c-roundtrip",
    action,
    createdAt: "2026-05-01T09:00:00Z",
    actorDisplayName: "テスト太郎",
    payload,
  };
}

describe("CaseCommsLogsAdapter timeline i18n roundtrip — generated_document.finalized", () => {
  it("ja-JP: finalize event with title renders 「文書確定：<title>」", () => {
    const i18n = makeI18n("ja-JP");
    const t = i18n.global.t;

    const entry = adaptCaseLogDto(
      makeLogDto("generated_document.finalized", {
        title: "R39-MCP-TITLE-PROBE",
      }),
    );

    expect(entry).not.toBeNull();
    expect(entry!.text).toBe("cases.log.timeline.generatedDocumentFinalized");
    expect(entry!.textParams).toMatchObject({
      suffix: "R39-MCP-TITLE-PROBE",
      colonSuffix: "：R39-MCP-TITLE-PROBE",
    });

    const rendered = t(entry!.text, entry!.textParams ?? {});
    expect(rendered).toBe("文書確定：R39-MCP-TITLE-PROBE");
  });

  it("zh-CN: finalize event with title renders 「文书定稿：<title>」", () => {
    const i18n = makeI18n("zh-CN");
    const t = i18n.global.t;

    const entry = adaptCaseLogDto(
      makeLogDto("generated_document.finalized", {
        title: "R39-MCP-TITLE-PROBE",
      }),
    );

    expect(entry).not.toBeNull();
    const rendered = t(entry!.text, entry!.textParams ?? {});
    expect(rendered).toBe("文书定稿：R39-MCP-TITLE-PROBE");
  });

  it("en-US: finalize event with title renders 'Document finalized：<title>'", () => {
    const i18n = makeI18n("en-US");
    const t = i18n.global.t;

    const entry = adaptCaseLogDto(
      makeLogDto("generated_document.finalized", {
        title: "R39-MCP-TITLE-PROBE",
      }),
    );

    expect(entry).not.toBeNull();
    const rendered = t(entry!.text, entry!.textParams ?? {});
    expect(rendered).toBe("Document finalized：R39-MCP-TITLE-PROBE");
  });

  it("ja-JP: finalize event without title renders 「文書確定」 (no colon)", () => {
    const i18n = makeI18n("ja-JP");
    const t = i18n.global.t;

    const entry = adaptCaseLogDto(
      makeLogDto("generated_document.finalized", {}),
    );

    expect(entry).not.toBeNull();
    expect(entry!.textParams).toMatchObject({
      suffix: "",
      colonSuffix: "",
    });

    const rendered = t(entry!.text, entry!.textParams ?? {});
    expect(rendered).toBe("文書確定");
  });

  it("ja-JP: finalize event with templateName fallback renders title correctly", () => {
    const i18n = makeI18n("ja-JP");
    const t = i18n.global.t;

    const entry = adaptCaseLogDto(
      makeLogDto("generated_document.finalized", {
        templateName: "申請理由書",
      }),
    );

    expect(entry).not.toBeNull();
    const rendered = t(entry!.text, entry!.textParams ?? {});
    expect(rendered).toBe("文書確定：申請理由書");
  });
});
