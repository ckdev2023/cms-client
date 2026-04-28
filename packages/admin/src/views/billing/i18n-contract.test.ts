import { describe, expect, it } from "vitest";
import billingEnUS from "../../i18n/messages/billing/en-US";
import billingJaJP from "../../i18n/messages/billing/ja-JP";
import billingZhCN from "../../i18n/messages/billing/zh-CN";

type LocaleMessages = typeof billingEnUS;

const LOCALES: { name: string; messages: LocaleMessages }[] = [
  { name: "en-US", messages: billingEnUS },
  { name: "zh-CN", messages: billingZhCN as unknown as LocaleMessages },
  { name: "ja-JP", messages: billingJaJP as unknown as LocaleMessages },
];

function collectLeafKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...collectLeafKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

function resolveKey(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object")
      return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

describe("billing i18n cross-locale key parity", () => {
  const enKeys = collectLeafKeys(
    billingEnUS as unknown as Record<string, unknown>,
  );

  it("zh-CN has same keys as en-US", () => {
    const zhKeys = collectLeafKeys(
      billingZhCN as unknown as Record<string, unknown>,
    );
    expect(zhKeys).toEqual(enKeys);
  });

  it("ja-JP has same keys as en-US", () => {
    const jaKeys = collectLeafKeys(
      billingJaJP as unknown as Record<string, unknown>,
    );
    expect(jaKeys).toEqual(enKeys);
  });
});

describe("billing i18n required key groups", () => {
  const RISK_ACK_KEYS = [
    "riskAck.modal.title",
    "riskAck.modal.submit",
    "riskAck.modal.cancel",
    "riskAck.reasonCode.customer_promise",
    "riskAck.reasonCode.internal_review",
    "riskAck.reasonCode.partial_settled",
    "riskAck.reasonCode.other",
    "riskAck.reasonNote.placeholder",
    "riskAck.evidenceUrl.placeholder",
    "riskAck.chip.acknowledged",
    "riskAck.chip.notAcknowledged",
  ];

  const BULK_COLLECT_SKIP_REASON_KEYS = [
    "bulkCollect.skipReason.no-permission",
    "bulkCollect.skipReason.duplicate-task",
    "bulkCollect.skipReason.not-overdue",
    "bulkCollect.skipReason.no-assignee",
    "bulkCollect.skipReason.system-error",
  ];

  const BULK_COLLECT_DRAWER_KEYS = [
    "bulkCollect.drawer.title",
    "bulkCollect.drawer.empty",
    "bulkCollect.drawer.details",
  ];

  const PAYMENT_LOG_TOAST_KEYS = [
    "paymentLog.toast.voided.title",
    "paymentLog.toast.voided.description",
    "paymentLog.toast.reversed.title",
    "paymentLog.toast.reversed.description",
  ];

  const PAYMENT_LOG_ROW_KEYS = [
    "paymentLog.row.voidedBy",
    "paymentLog.row.reversedBy",
  ];

  const LIST_PAGINATION_KEYS = [
    "list.pagination.summary",
    "list.pagination.prev",
    "list.pagination.next",
  ];

  const LIST_EMPTY_KEYS = [
    "list.empty.noData",
    "list.empty.noResultForFilters",
  ];

  const LIST_ERROR_KEYS = ["list.error.loadFailed", "list.error.retry"];

  const ALL_REQUIRED = [
    ...RISK_ACK_KEYS,
    ...BULK_COLLECT_SKIP_REASON_KEYS,
    ...BULK_COLLECT_DRAWER_KEYS,
    ...PAYMENT_LOG_TOAST_KEYS,
    ...PAYMENT_LOG_ROW_KEYS,
    ...LIST_PAGINATION_KEYS,
    ...LIST_EMPTY_KEYS,
    ...LIST_ERROR_KEYS,
  ];

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all required billing keys resolve in %s",
    (_, locale) => {
      const missing: string[] = [];
      for (const key of ALL_REQUIRED) {
        const value = resolveKey(
          locale.messages as unknown as Record<string, unknown>,
          key,
        );
        if (value === undefined || value === null || value === "") {
          missing.push(key);
        }
      }
      expect(
        missing,
        `${locale.name} missing keys: ${missing.join(", ")}`,
      ).toEqual([]);
    },
  );

  it.each(LOCALES.map((l) => [l.name, l] as const))(
    "all required billing keys are strings in %s",
    (_, locale) => {
      for (const key of ALL_REQUIRED) {
        const value = resolveKey(
          locale.messages as unknown as Record<string, unknown>,
          key,
        );
        expect(typeof value, `${locale.name} key ${key} should be string`).toBe(
          "string",
        );
      }
    },
  );
});
