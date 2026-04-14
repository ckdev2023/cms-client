import { describe, it, expect } from "vitest";
import { usePaymentModal } from "./usePaymentModal";
import type { BillingPlanNode } from "../types";

const NODES_MIXED: BillingPlanNode[] = [
  {
    id: "node-1",
    name: "着手金 (50%)",
    amount: 175000,
    dueDate: "2026/04/01",
    status: "paid",
  },
  {
    id: "node-2",
    name: "尾款 (50%)",
    amount: 175000,
    dueDate: "2026/05/01",
    status: "due",
  },
];

const NODES_ALL_UNPAID: BillingPlanNode[] = [
  {
    id: "node-a",
    name: "着手金",
    amount: 100000,
    dueDate: "2026/04/01",
    status: "due",
  },
  {
    id: "node-b",
    name: "尾款",
    amount: 200000,
    dueDate: "2026/05/01",
    status: "overdue",
  },
];

const NODES_SINGLE: BillingPlanNode[] = [
  {
    id: "node-x",
    name: "全款",
    amount: 500000,
    dueDate: "2026/04/04",
    status: "overdue",
  },
];

describe("usePaymentModal", () => {
  it("initializes with closed state and empty fields", () => {
    const m = usePaymentModal();
    expect(m.isOpen.value).toBe(false);
    expect(m.fields.value.amount).toBe("");
    expect(m.fields.value.date).toBe("");
    expect(m.availableNodes.value).toHaveLength(0);
  });

  it("open sets isOpen to true", () => {
    const m = usePaymentModal();
    m.open([]);
    expect(m.isOpen.value).toBe(true);
  });

  it("open filters out paid nodes", () => {
    const m = usePaymentModal();
    m.open(NODES_MIXED);
    expect(m.availableNodes.value).toHaveLength(1);
    expect(m.availableNodes.value[0].id).toBe("node-2");
  });

  it("auto-selects when only one unpaid node remains", () => {
    const m = usePaymentModal();
    m.open(NODES_MIXED);
    expect(m.fields.value.billingPlanId).toBe("node-2");
  });

  it("does not auto-select when multiple unpaid nodes", () => {
    const m = usePaymentModal();
    m.open(NODES_ALL_UNPAID);
    expect(m.fields.value.billingPlanId).toBe("");
  });

  it("auto-selects single node passed directly", () => {
    const m = usePaymentModal();
    m.open(NODES_SINGLE);
    expect(m.fields.value.billingPlanId).toBe("node-x");
  });

  it("canSubmit is false when amount is empty", () => {
    const m = usePaymentModal();
    m.open([]);
    m.fields.value.date = "2026-04-13";
    expect(m.canSubmit.value).toBe(false);
  });

  it("canSubmit is false when date is empty", () => {
    const m = usePaymentModal();
    m.open([]);
    m.fields.value.amount = "100000";
    expect(m.canSubmit.value).toBe(false);
  });

  it("canSubmit is true when amount and date are filled (no nodes)", () => {
    const m = usePaymentModal();
    m.open([]);
    m.fields.value.amount = "100000";
    m.fields.value.date = "2026-04-13";
    expect(m.canSubmit.value).toBe(true);
  });

  it("canSubmit is false when multiple unpaid nodes and none selected", () => {
    const m = usePaymentModal();
    m.open(NODES_ALL_UNPAID);
    m.fields.value.amount = "100000";
    m.fields.value.date = "2026-04-13";
    expect(m.canSubmit.value).toBe(false);
  });

  it("canSubmit is true when node is selected with required fields", () => {
    const m = usePaymentModal();
    m.open(NODES_ALL_UNPAID);
    m.fields.value.amount = "100000";
    m.fields.value.date = "2026-04-13";
    m.fields.value.billingPlanId = "node-a";
    expect(m.canSubmit.value).toBe(true);
  });

  it("canSubmit is false for zero amount", () => {
    const m = usePaymentModal();
    m.open([]);
    m.fields.value.amount = "0";
    m.fields.value.date = "2026-04-13";
    expect(m.canSubmit.value).toBe(false);
  });

  it("canSubmit is false for negative amount", () => {
    const m = usePaymentModal();
    m.open([]);
    m.fields.value.amount = "-500";
    m.fields.value.date = "2026-04-13";
    expect(m.canSubmit.value).toBe(false);
  });

  it("needsNodeSelection is true when multiple unpaid and no selection", () => {
    const m = usePaymentModal();
    m.open(NODES_ALL_UNPAID);
    expect(m.needsNodeSelection.value).toBe(true);
  });

  it("needsNodeSelection is false when single unpaid node (auto-selected)", () => {
    const m = usePaymentModal();
    m.open(NODES_MIXED);
    expect(m.needsNodeSelection.value).toBe(false);
  });

  it("needsNodeSelection is false when no nodes", () => {
    const m = usePaymentModal();
    m.open([]);
    expect(m.needsNodeSelection.value).toBe(false);
  });

  it("amountExceedsNode detects when amount exceeds node", () => {
    const m = usePaymentModal();
    m.open(NODES_SINGLE);
    m.fields.value.amount = "600000";
    expect(m.amountExceedsNode.value).toBe(true);
  });

  it("amountExceedsNode is false when within limit", () => {
    const m = usePaymentModal();
    m.open(NODES_SINGLE);
    m.fields.value.amount = "400000";
    expect(m.amountExceedsNode.value).toBe(false);
  });

  it("amountExceedsNode is false when no node selected", () => {
    const m = usePaymentModal();
    m.open(NODES_ALL_UNPAID);
    m.fields.value.amount = "999999";
    expect(m.amountExceedsNode.value).toBe(false);
  });

  it("amountExceedsNode is false when amount is empty", () => {
    const m = usePaymentModal();
    m.open(NODES_SINGLE);
    expect(m.amountExceedsNode.value).toBe(false);
  });

  it("selectedNode reflects the chosen node", () => {
    const m = usePaymentModal();
    m.open(NODES_ALL_UNPAID);
    expect(m.selectedNode.value).toBeNull();
    m.fields.value.billingPlanId = "node-a";
    expect(m.selectedNode.value?.id).toBe("node-a");
  });

  it("parsedAmount parses string amount", () => {
    const m = usePaymentModal();
    m.fields.value.amount = "175000";
    expect(m.parsedAmount.value).toBe(175000);
  });

  it("parsedAmount returns 0 for non-numeric input", () => {
    const m = usePaymentModal();
    m.fields.value.amount = "abc";
    expect(m.parsedAmount.value).toBe(0);
  });

  it("close resets form and sets isOpen to false", () => {
    const m = usePaymentModal();
    m.open(NODES_ALL_UNPAID);
    m.fields.value.amount = "100000";
    m.fields.value.date = "2026-04-13";
    m.close();
    expect(m.isOpen.value).toBe(false);
    expect(m.fields.value.amount).toBe("");
    expect(m.fields.value.date).toBe("");
    expect(m.fields.value.billingPlanId).toBe("");
    expect(m.availableNodes.value).toHaveLength(0);
  });

  it("resetForm clears fields without changing isOpen", () => {
    const m = usePaymentModal();
    m.open(NODES_SINGLE);
    m.fields.value.amount = "100000";
    m.resetForm();
    expect(m.fields.value.amount).toBe("");
    expect(m.availableNodes.value).toHaveLength(0);
  });
});
