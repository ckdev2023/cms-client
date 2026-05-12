import test from "node:test";
import assert from "node:assert/strict";

import {
  isLeadP0Status,
  isLeadFollowupChannel,
  mapLeadFollowupChannelToCommunicationChannel,
  mapLeadSourceChannelToFollowupChannel,
  mapLeadFollowupRow,
  mapLeadLogRow,
  LEAD_P0_STATUSES,
  LEAD_FOLLOWUP_CHANNELS,
  LEAD_STATUS_TRANSITIONS,
  type LeadP0Status,
} from "./leadEntities";

// ── isLeadP0Status ──

void test("isLeadP0Status returns true for all P0 statuses", () => {
  for (const s of LEAD_P0_STATUSES) {
    assert.equal(isLeadP0Status(s), true, `expected true for "${s}"`);
  }
});

void test("isLeadP0Status returns false for legacy/unknown statuses", () => {
  assert.equal(isLeadP0Status("contacted"), false);
  assert.equal(isLeadP0Status("assigned"), false);
  assert.equal(isLeadP0Status("converted"), false);
  assert.equal(isLeadP0Status("closed"), false);
  assert.equal(isLeadP0Status(""), false);
  assert.equal(isLeadP0Status(null), false);
  assert.equal(isLeadP0Status(undefined), false);
  assert.equal(isLeadP0Status(42), false);
});

// ── LEAD_STATUS_TRANSITIONS ──

void test("lost can transition to following (revival path)", () => {
  const targets = LEAD_STATUS_TRANSITIONS.get("lost");
  assert.ok(targets);
  assert.equal(targets.has("following"), true);
});

void test("converted_case has no outgoing transitions", () => {
  const targets = LEAD_STATUS_TRANSITIONS.get("converted_case");
  assert.ok(targets);
  assert.equal(targets.size, 0);
});

void test("new can skip ahead to any non-terminal status or be marked lost", () => {
  const targets = LEAD_STATUS_TRANSITIONS.get("new");
  assert.ok(targets);
  assert.equal(targets.has("following"), true);
  assert.equal(targets.has("pending_sign"), true);
  assert.equal(targets.has("signed"), true);
  assert.equal(targets.has("lost"), true);
  assert.equal(targets.has("converted_case"), false);
  assert.equal(targets.size, 4);
});

void test("non-terminal statuses are mutually reachable (forward skip + backward correction)", () => {
  const NON_TERMINAL: LeadP0Status[] = [
    "new",
    "following",
    "pending_sign",
    "signed",
  ];
  for (const from of NON_TERMINAL) {
    const targets = LEAD_STATUS_TRANSITIONS.get(from);
    assert.ok(targets);
    for (const to of NON_TERMINAL) {
      if (from === to) continue;
      assert.equal(
        targets.has(to),
        true,
        `expected ${from} → ${to} to be allowed`,
      );
    }
  }
});

void test("signed retains converted_case path; only signed reaches converted_case", () => {
  const signedTargets = LEAD_STATUS_TRANSITIONS.get("signed");
  assert.ok(signedTargets);
  assert.equal(signedTargets.has("converted_case"), true);

  for (const from of ["new", "following", "pending_sign"] as const) {
    const targets = LEAD_STATUS_TRANSITIONS.get(from);
    assert.ok(targets);
    assert.equal(
      targets.has("converted_case"),
      false,
      `${from} must not reach converted_case directly`,
    );
  }
});

void test("lost revival path remains restricted to following only", () => {
  const targets = LEAD_STATUS_TRANSITIONS.get("lost");
  assert.ok(targets);
  assert.equal(targets.has("following"), true);
  assert.equal(targets.size, 1);
});

void test("every P0 status has an entry in the transition map", () => {
  for (const s of LEAD_P0_STATUSES) {
    assert.ok(
      LEAD_STATUS_TRANSITIONS.has(s),
      `missing transition entry for "${s}"`,
    );
  }
});

// ── isLeadFollowupChannel ──

void test("isLeadFollowupChannel returns true for all channels", () => {
  for (const ch of LEAD_FOLLOWUP_CHANNELS) {
    assert.equal(isLeadFollowupChannel(ch), true, `expected true for "${ch}"`);
  }
});

void test("isLeadFollowupChannel returns false for unknown values", () => {
  assert.equal(isLeadFollowupChannel("sms"), false);
  assert.equal(isLeadFollowupChannel(""), false);
  assert.equal(isLeadFollowupChannel(null), false);
});

void test("mapLeadFollowupChannelToCommunicationChannel maps onsite to meeting", () => {
  assert.equal(
    mapLeadFollowupChannelToCommunicationChannel("onsite"),
    "meeting",
  );
});

void test("mapLeadFollowupChannelToCommunicationChannel preserves known channels", () => {
  for (const ch of ["phone", "email", "wechat", "line", "other"] as const) {
    assert.equal(mapLeadFollowupChannelToCommunicationChannel(ch), ch);
  }
});

void test("mapLeadFollowupChannelToCommunicationChannel falls back to other", () => {
  assert.equal(mapLeadFollowupChannelToCommunicationChannel("sms"), "other");
  assert.equal(mapLeadFollowupChannelToCommunicationChannel(""), "other");
});

void test("mapLeadSourceChannelToFollowupChannel maps marketing sources", () => {
  assert.equal(mapLeadSourceChannelToFollowupChannel("phone"), "phone");
  assert.equal(mapLeadSourceChannelToFollowupChannel("walkin"), "onsite");
  assert.equal(mapLeadSourceChannelToFollowupChannel("web"), "other");
  assert.equal(mapLeadSourceChannelToFollowupChannel("referral"), "other");
  assert.equal(mapLeadSourceChannelToFollowupChannel(null), "other");
});

// ── mapLeadFollowupRow ──

void test("mapLeadFollowupRow maps full row", () => {
  const row = {
    id: "f1",
    lead_id: "l1",
    channel: "phone",
    summary: "Discussed visa plan",
    conclusion: "Will send questionnaire",
    next_action: "send_questionnaire",
    next_follow_up_at: "2026-05-01T10:00:00.000Z",
    created_by: "u1",
    created_at: "2026-04-20T09:00:00.000Z",
  };
  const result = mapLeadFollowupRow(row);
  assert.equal(result.id, "f1");
  assert.equal(result.leadId, "l1");
  assert.equal(result.channel, "phone");
  assert.equal(result.summary, "Discussed visa plan");
  assert.equal(result.conclusion, "Will send questionnaire");
  assert.equal(result.nextAction, "send_questionnaire");
  assert.equal(result.nextFollowUpAt, "2026-05-01T10:00:00.000Z");
  assert.equal(result.createdBy, "u1");
  assert.equal(result.createdAt, "2026-04-20T09:00:00.000Z");
});

void test("mapLeadFollowupRow handles null optional fields", () => {
  const row = {
    id: "f2",
    lead_id: "l1",
    channel: "email",
    summary: null,
    conclusion: null,
    next_action: null,
    next_follow_up_at: null,
    created_by: null,
    created_at: "2026-04-20T09:00:00.000Z",
  };
  const result = mapLeadFollowupRow(row);
  assert.equal(result.summary, null);
  assert.equal(result.conclusion, null);
  assert.equal(result.nextAction, null);
  assert.equal(result.nextFollowUpAt, null);
  assert.equal(result.createdBy, null);
});

void test("mapLeadFollowupRow converts Date next_follow_up_at", () => {
  const row = {
    id: "f3",
    lead_id: "l1",
    channel: "onsite",
    summary: null,
    conclusion: null,
    next_action: null,
    next_follow_up_at: new Date("2026-06-01T14:00:00.000Z"),
    created_by: null,
    created_at: "2026-04-20T09:00:00.000Z",
  };
  const result = mapLeadFollowupRow(row);
  assert.equal(result.nextFollowUpAt, "2026-06-01T14:00:00.000Z");
});

void test("mapLeadFollowupRow throws on invalid created_at", () => {
  const row = {
    id: "f4",
    lead_id: "l1",
    channel: "phone",
    summary: null,
    conclusion: null,
    next_action: null,
    next_follow_up_at: null,
    created_by: null,
    created_at: null,
  };
  assert.throws(() => mapLeadFollowupRow(row), /Invalid timestamp: created_at/);
});

// ── mapLeadLogRow ──

void test("mapLeadLogRow maps full row with object payload", () => {
  const row = {
    id: "log1",
    lead_id: "l1",
    log_type: "field_change",
    payload: { field: "status", from: "new", to: "following" },
    created_by: "u1",
    created_by_display_name: "田中 太郎",
    created_at: "2026-04-20T10:00:00.000Z",
  };
  const result = mapLeadLogRow(row);
  assert.equal(result.id, "log1");
  assert.equal(result.leadId, "l1");
  assert.equal(result.logType, "field_change");
  assert.deepEqual(result.payload, {
    field: "status",
    from: "new",
    to: "following",
  });
  assert.equal(result.createdBy, "u1");
  assert.equal(result.createdByDisplayName, "田中 太郎");
  assert.equal(result.createdAt, "2026-04-20T10:00:00.000Z");
});

void test("mapLeadLogRow normalizes null payload to empty object", () => {
  const row = {
    id: "log2",
    lead_id: "l1",
    log_type: "converted",
    payload: null,
    created_by: "u1",
    created_by_display_name: null,
    created_at: "2026-04-20T10:00:00.000Z",
  };
  const result = mapLeadLogRow(row);
  assert.deepEqual(result.payload, {});
  assert.equal(result.createdByDisplayName, null);
});

void test("mapLeadLogRow normalizes JSON string payload", () => {
  const row = {
    id: "log3",
    lead_id: "l1",
    log_type: "status_change",
    payload: '{"from":"new","to":"lost","lost_reason":"no_budget"}',
    created_by: null,
    created_by_display_name: null,
    created_at: "2026-04-20T10:00:00.000Z",
  };
  const result = mapLeadLogRow(row);
  assert.deepEqual(result.payload, {
    from: "new",
    to: "lost",
    lost_reason: "no_budget",
  });
  assert.equal(result.createdBy, null);
  assert.equal(result.createdByDisplayName, null);
});

void test("mapLeadLogRow throws on invalid created_at", () => {
  const row = {
    id: "log4",
    lead_id: "l1",
    log_type: "test",
    payload: {},
    created_by: null,
    created_by_display_name: null,
    created_at: null,
  };
  assert.throws(() => mapLeadLogRow(row), /Invalid timestamp: created_at/);
});

void test("mapLeadLogRow defaults missing display name field to null (H-5)", () => {
  const row = {
    id: "log5",
    lead_id: "l1",
    log_type: "status_change",
    payload: { from: "new", to: "following" },
    created_by: "u1",
    created_at: "2026-04-20T10:00:00.000Z",
  } as unknown as Parameters<typeof mapLeadLogRow>[0];
  const result = mapLeadLogRow(row);
  assert.equal(result.createdByDisplayName, null);
});
