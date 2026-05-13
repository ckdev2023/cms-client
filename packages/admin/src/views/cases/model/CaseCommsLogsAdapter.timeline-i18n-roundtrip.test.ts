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
  it("ja-JP: finalize event with title renders 「文書確認済み：<title>」", () => {
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
    expect(rendered).toBe("文書確認済み：R39-MCP-TITLE-PROBE");
  });

  it("zh-CN: finalize event with title renders 「文书已确认：<title>」", () => {
    const i18n = makeI18n("zh-CN");
    const t = i18n.global.t;

    const entry = adaptCaseLogDto(
      makeLogDto("generated_document.finalized", {
        title: "R39-MCP-TITLE-PROBE",
      }),
    );

    expect(entry).not.toBeNull();
    const rendered = t(entry!.text, entry!.textParams ?? {});
    expect(rendered).toBe("文书已确认：R39-MCP-TITLE-PROBE");
  });

  it("en-US: finalize event with title renders 'Document confirmed：<title>'", () => {
    const i18n = makeI18n("en-US");
    const t = i18n.global.t;

    const entry = adaptCaseLogDto(
      makeLogDto("generated_document.finalized", {
        title: "R39-MCP-TITLE-PROBE",
      }),
    );

    expect(entry).not.toBeNull();
    const rendered = t(entry!.text, entry!.textParams ?? {});
    expect(rendered).toBe("Document confirmed：R39-MCP-TITLE-PROBE");
  });

  it("ja-JP: finalize event without title renders 「文書確認済み」 (no colon)", () => {
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
    expect(rendered).toBe("文書確認済み");
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
    expect(rendered).toBe("文書確認済み：申請理由書");
  });
});

// NEW-V5-4 回归：「由 LEAD-XXX 转化而来」三语 roundtrip。
describe("CaseCommsLogsAdapter timeline i18n roundtrip — case.converted_from_lead", () => {
  const PAYLOAD = {
    leadId: "fd3627bb-b5ea-454b-92a9-cd876c4d64d7",
    leadNo: "LEAD-202605-0010",
    customerId: "ba90e062-dc56-4ea5-9f7e-e32090dc021c",
  };

  it("zh-CN: renders 「由线索 LEAD-202605-0010 转化而来」", () => {
    const i18n = makeI18n("zh-CN");
    const entry = adaptCaseLogDto(
      makeLogDto("case.converted_from_lead", PAYLOAD),
    );
    expect(entry).not.toBeNull();
    expect(i18n.global.t(entry!.text, entry!.textParams ?? {})).toBe(
      "由线索 LEAD-202605-0010 转化而来",
    );
  });

  it("ja-JP: renders 「リード LEAD-202605-0010 から転化」", () => {
    const i18n = makeI18n("ja-JP");
    const entry = adaptCaseLogDto(
      makeLogDto("case.converted_from_lead", PAYLOAD),
    );
    expect(entry).not.toBeNull();
    expect(i18n.global.t(entry!.text, entry!.textParams ?? {})).toBe(
      "リード LEAD-202605-0010 から転化",
    );
  });

  it("en-US: renders 'Converted from lead LEAD-202605-0010'", () => {
    const i18n = makeI18n("en-US");
    const entry = adaptCaseLogDto(
      makeLogDto("case.converted_from_lead", PAYLOAD),
    );
    expect(entry).not.toBeNull();
    expect(i18n.global.t(entry!.text, entry!.textParams ?? {})).toBe(
      "Converted from lead LEAD-202605-0010",
    );
  });

  it("falls back to leadId 8-char prefix when leadNo missing (zh-CN)", () => {
    const i18n = makeI18n("zh-CN");
    const entry = adaptCaseLogDto(
      makeLogDto("case.converted_from_lead", {
        leadId: "fd3627bb-b5ea-454b-92a9-cd876c4d64d7",
        customerId: "ba90e062-dc56-4ea5-9f7e-e32090dc021c",
      }),
    );
    expect(entry).not.toBeNull();
    expect(i18n.global.t(entry!.text, entry!.textParams ?? {})).toBe(
      "由线索 fd3627bb 转化而来",
    );
  });
});
