/**
 * BUG-184 [P0][BE]：Dashboard mine scope 500 — pg `timestamp with time zone`
 * 列默认被解析为 JS `Date`（OID 1184 parser），而 `formatDateLabel` 直接
 * 调用 `value.slice(0,10)` 抛 `TypeError`，导致 `loadRiskItems` /
 * `loadDeadlineItems` / `loadSubmissionItems` / `loadTodoItems` 在任一
 * `due_at` 非 null 命中行时整个 `GET /dashboard/summary?scope=mine` 500。
 *
 * 修复契约（dashboard.workItem.ts）：
 * - `formatDateLabel(string)` → `string.slice(0,10)`（保留旧行为）
 * - `formatDateLabel(Date)` → `date.toISOString().slice(0,10)`（与 ISO Z
 *   字符串 slice 出来的日期一致）
 * - `formatDateLabel(null | undefined)` → `undefined`
 * - `formatDateLabel(invalid Date)` → `undefined`（防御）
 * - 四个 mapper（`mapTodoItem` / `mapDeadlineItem` / `mapSubmissionItem` /
 *   `mapRiskItem`）在 `due_at` 为 `Date` 时不抛，且 `metaKeys` 中
 *   `{ key:"due", params:{ date:"YYYY-MM-DD" } }` 正确生成。
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  mapDeadlineItem,
  mapRiskItem,
  mapSubmissionItem,
  mapTodoItem,
} from "./dashboard.workItem";
import type {
  DeadlineRow,
  RiskRow,
  SubmissionRow,
  TodoRow,
} from "./dashboard.shared";

const ISO = "2026-08-31T00:00:00.000Z";
const ISO_DATE = "2026/08/31";

function findDueMetaKey(metaKeys: { key: string }[] | undefined) {
  return metaKeys?.find((m) => m.key === "due") as
    | { key: "due"; params: { date: string } }
    | undefined;
}

void test("[BUG-184] mapTodoItem 接受 due_at 为 Date 不抛 + metaKey/meta 输出 ISO 日期", () => {
  const row: TodoRow = {
    id: "task-1",
    title: "Prepare submission",
    case_id: "case-1",
    case_no: "CASE-001",
    case_name: null,
    assignee_name: "Tanaka",
    due_at: new Date(ISO),
    priority: "high",
    status: "pending",
  };
  const item = mapTodoItem(row);
  assert.equal(findDueMetaKey(item.metaKeys)?.params.date, ISO_DATE);
  assert.ok(
    item.meta.some((m) => m.includes(ISO_DATE)),
    `meta 必须含 ${ISO_DATE}，实际：${JSON.stringify(item.meta)}`,
  );
});

void test("[BUG-184] mapDeadlineItem 接受 due_at 为 Date 不抛 + metaKey/meta 输出 ISO 日期", () => {
  const row: DeadlineRow = {
    id: "case-2",
    case_no: "CASE-002",
    case_name: "续签案件",
    owner_name: "Suzuki",
    due_at: new Date(ISO),
    status: "S5",
    days_left: 3,
  };
  const item = mapDeadlineItem(row);
  assert.equal(findDueMetaKey(item.metaKeys)?.params.date, ISO_DATE);
  assert.ok(
    item.meta.some((m) => m.includes(ISO_DATE)),
    `meta 必须含 ${ISO_DATE}，实际：${JSON.stringify(item.meta)}`,
  );
});

void test("[BUG-184] mapSubmissionItem 接受 due_at 为 Date 不抛 + metaKey/meta 输出 ISO 日期", () => {
  const row: SubmissionRow = {
    id: "case-3",
    case_no: "CASE-003",
    case_name: null,
    owner_name: "Sato",
    due_at: new Date(ISO),
    validation_status: "passed",
    review_decision: "approved",
  };
  const item = mapSubmissionItem(row);
  assert.equal(findDueMetaKey(item.metaKeys)?.params.date, ISO_DATE);
  assert.ok(
    item.meta.some((m) => m.includes(ISO_DATE)),
    `meta 必须含 ${ISO_DATE}，实际：${JSON.stringify(item.meta)}`,
  );
});

void test("[BUG-184] mapRiskItem 接受 due_at 为 Date 不抛 + metaKey/meta 输出 ISO 日期（实际线上触发路径）", () => {
  const row: RiskRow = {
    id: "case-4",
    case_no: "CASE-004",
    case_name: null,
    owner_name: "Yamada",
    due_at: new Date(ISO),
    risk_level: "high",
    validation_status: null,
    unpaid_amount: "150000",
  };
  const item = mapRiskItem(row);
  assert.equal(findDueMetaKey(item.metaKeys)?.params.date, ISO_DATE);
  assert.ok(
    item.meta.some((m) => m.includes(ISO_DATE)),
    `meta 必须含 ${ISO_DATE}，实际：${JSON.stringify(item.meta)}`,
  );
});

void test("[BUG-184] mapRiskItem 在 due_at 为 null 时不抛，metaKeys 不包含 due 项", () => {
  const row: RiskRow = {
    id: "case-5",
    case_no: "CASE-005",
    case_name: null,
    owner_name: null,
    due_at: null,
    risk_level: "high",
    validation_status: "failed",
    unpaid_amount: "0",
  };
  const item = mapRiskItem(row);
  assert.equal(findDueMetaKey(item.metaKeys), undefined);
  assert.equal(
    item.meta.find((m) => m.startsWith("期限：")),
    undefined,
  );
});

void test("[BUG-184] mapTodoItem 兼容 due_at 仍为 ISO 字符串（向后兼容旧 mock / to_char 路径）", () => {
  const row: TodoRow = {
    id: "task-2",
    title: "Backwards-compat",
    case_id: null,
    case_no: null,
    case_name: null,
    assignee_name: null,
    due_at: ISO,
    priority: "normal",
    status: "pending",
  };
  const item = mapTodoItem(row);
  assert.equal(findDueMetaKey(item.metaKeys)?.params.date, ISO_DATE);
});

void test("[BUG-184] mapDeadlineItem 在 due_at 为 invalid Date 时降级为不输出 due metaKey", () => {
  const row: DeadlineRow = {
    id: "case-6",
    case_no: "CASE-006",
    case_name: null,
    owner_name: null,
    due_at: new Date("not-a-date"),
    status: "S5",
    days_left: 3,
  };
  const item = mapDeadlineItem(row);
  assert.equal(findDueMetaKey(item.metaKeys), undefined);
  assert.equal(
    item.meta.find((m) => m.startsWith("期限：")),
    undefined,
  );
});
