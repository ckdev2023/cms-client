/**
 * NEW-V5-4 回归：案件 timeline 增加 `case.converted_from_lead` action，
 * 与 LEAD 侧 `lead.converted_case` 形成双向可追溯对。
 */

import { describe, it, expect } from "vitest";
import { buildCaseTimelineMessageResult } from "./CaseCommsTimelineBuilders";
import { adaptCaseLogDto, resolveLogCategory } from "./CaseCommsLogsAdapter";

describe("CaseCommsTimelineBuilders — case.converted_from_lead", () => {
  it("uses leadNo as leadRef when present", () => {
    const result = buildCaseTimelineMessageResult("case.converted_from_lead", {
      leadId: "fd3627bb-b5ea-454b-92a9-cd876c4d64d7",
      leadNo: "LEAD-202605-0010",
      customerId: "ba90e062-dc56-4ea5-9f7e-e32090dc021c",
    });

    expect(result.key).toBe("cases.log.timeline.caseConvertedFromLead");
    expect(result.params).toMatchObject({
      leadRef: "LEAD-202605-0010",
      leadNo: "LEAD-202605-0010",
      leadId: "fd3627bb-b5ea-454b-92a9-cd876c4d64d7",
      customerId: "ba90e062-dc56-4ea5-9f7e-e32090dc021c",
    });
  });

  it("falls back to leadId 8-char prefix when leadNo is missing", () => {
    const result = buildCaseTimelineMessageResult("case.converted_from_lead", {
      leadId: "fd3627bb-b5ea-454b-92a9-cd876c4d64d7",
      customerId: "ba90e062-dc56-4ea5-9f7e-e32090dc021c",
    });

    expect(result.key).toBe("cases.log.timeline.caseConvertedFromLead");
    expect(result.params?.leadRef).toBe("fd3627bb");
    expect(result.params?.leadNo).toBe("");
    expect(result.params?.leadId).toBe("fd3627bb-b5ea-454b-92a9-cd876c4d64d7");
  });

  it("accepts snake_case payload keys (lead_no / lead_id / customer_id)", () => {
    const result = buildCaseTimelineMessageResult("case.converted_from_lead", {
      lead_id: "fd3627bb-b5ea-454b-92a9-cd876c4d64d7",
      lead_no: "LEAD-202605-0010",
      customer_id: "ba90e062-dc56-4ea5-9f7e-e32090dc021c",
    });

    expect(result.params).toMatchObject({
      leadRef: "LEAD-202605-0010",
      leadNo: "LEAD-202605-0010",
      leadId: "fd3627bb-b5ea-454b-92a9-cd876c4d64d7",
      customerId: "ba90e062-dc56-4ea5-9f7e-e32090dc021c",
    });
  });

  it("returns empty leadRef when both leadNo and leadId are absent", () => {
    const result = buildCaseTimelineMessageResult(
      "case.converted_from_lead",
      {},
    );
    expect(result.key).toBe("cases.log.timeline.caseConvertedFromLead");
    expect(result.params?.leadRef).toBe("");
  });

  it("classifies the action as operation category (not status / review)", () => {
    expect(resolveLogCategory("case.converted_from_lead")).toBe("operation");
  });

  it("flows through adaptCaseLogDto with operation category and case object type", () => {
    const entry = adaptCaseLogDto({
      id: "tl-converted-from-lead-1",
      action: "case.converted_from_lead",
      actorDisplayName: "Tanaka Yuki",
      payload: {
        leadId: "fd3627bb-b5ea-454b-92a9-cd876c4d64d7",
        leadNo: "LEAD-202605-0010",
        customerId: "ba90e062-dc56-4ea5-9f7e-e32090dc021c",
      },
      createdAt: "2026-05-08T08:22:00.000Z",
    });

    expect(entry).not.toBeNull();
    expect(entry!.type).toBe("operation");
    expect(entry!.category).toBe("cases.log.category.operation");
    expect(entry!.text).toBe("cases.log.timeline.caseConvertedFromLead");
    expect(entry!.textParams).toMatchObject({
      leadRef: "LEAD-202605-0010",
      leadNo: "LEAD-202605-0010",
      leadId: "fd3627bb-b5ea-454b-92a9-cd876c4d64d7",
      customerId: "ba90e062-dc56-4ea5-9f7e-e32090dc021c",
    });
    expect(entry!.objectType).toBe("cases.log.objectType.case");
  });
});
