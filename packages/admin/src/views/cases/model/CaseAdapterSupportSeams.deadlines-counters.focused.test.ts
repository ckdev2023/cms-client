import { describe, expect, it, vi } from "vitest";
import { ref, nextTick } from "vue";
import { adaptCaseDeadlineList } from "./CaseAdapterSupportSeams";
import { useCaseDetailModel } from "./useCaseDetailModel";
import type { CaseRepository } from "./CaseRepository";
import type { CaseDetail } from "../types";
import type { CaseDetailAggregate } from "./CaseAdapterDetailContracts";

type R = Record<string, unknown>;

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function pastDate(daysAgo: number): string {
  return futureDate(-daysAgo);
}

const reminderDto = (overrides: R = {}): R => ({
  id: "rem-f01",
  orgId: "org-001",
  caseId: "case-f01",
  targetType: "case",
  targetId: "case-f01",
  remindAt: futureDate(45),
  recipientType: "user",
  recipientId: "user-1",
  channel: "in_app",
  dedupeKey: null,
  sendStatus: "pending",
  retryCount: 0,
  sentAt: null,
  payloadSnapshot: { title: "申請書提出期限", description: "入管への提出" },
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  ...overrides,
});

describe("deadlines tab severity tier filtering (p0-fe-006d-03)", () => {
  it("overdue → danger + 超過 remaining text", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: pastDate(5) })],
    })!;
    expect(result[0].severity).toBe("danger");
    expect(result[0].remaining).toContain("超過");
    expect(result[0].remaining).toContain("5");
  });

  it("today → danger + 本日", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: today.toISOString() })],
    })!;
    expect(result[0].severity).toBe("danger");
    expect(result[0].remaining).toBe("本日");
  });

  it("within 7 days → danger + あとN日", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: futureDate(5) })],
    })!;
    expect(result[0].severity).toBe("danger");
    expect(result[0].remaining).toMatch(/^あと\d+日$/);
  });

  it("8–30 days → warning + あとN日", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: futureDate(20) })],
    })!;
    expect(result[0].severity).toBe("warning");
    expect(result[0].remaining).toMatch(/^あと\d+日$/);
  });

  it("31–90 days → primary + あとN日", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: futureDate(60) })],
    })!;
    expect(result[0].severity).toBe("primary");
    expect(result[0].remaining).toMatch(/^あと\d+日$/);
  });

  it(">90 days → muted + あとN日", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: futureDate(120) })],
    })!;
    expect(result[0].severity).toBe("muted");
    expect(result[0].remaining).toMatch(/^あと\d+日$/);
  });

  it("null remindAt → muted severity, — remaining", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: null })],
    })!;
    expect(result[0].severity).toBe("muted");
    expect(result[0].remaining).toBe("—");
  });

  it("invalid date string → muted severity", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: "not-a-date" })],
    })!;
    expect(result[0].severity).toBe("muted");
    expect(result[0].remaining).toBe("—");
  });

  it("mixed severities allow consumer to filter urgent deadlines", () => {
    const result = adaptCaseDeadlineList({
      items: [
        reminderDto({ id: "r1", remindAt: pastDate(3) }),
        reminderDto({ id: "r2", remindAt: futureDate(5) }),
        reminderDto({ id: "r3", remindAt: futureDate(15) }),
        reminderDto({ id: "r4", remindAt: futureDate(60) }),
        reminderDto({ id: "r5", remindAt: futureDate(120) }),
      ],
    })!;
    const urgent = result.filter(
      (d) => d.severity === "danger" || d.severity === "warning",
    );
    expect(urgent).toHaveLength(3);
    expect(urgent.map((d) => d.id)).toEqual(["r1", "r2", "r3"]);
  });
});

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

async function flushAll(): Promise<void> {
  await flushFetch();
  await flushFetch();
}

const BASE_DETAIL: CaseDetail = {
  id: "CASE-TC",
  title: "テスト案件",
  client: "テスト太郎",
  owner: "担当者A",
  agency: "",
  stage: "S3",
  stageCode: "S3",
  stageMeta: "",
  statusBadge: "active",
  deadline: "",
  deadlineMeta: "",
  deadlineDanger: false,
  progressPercent: 50,
  progressCount: "8/16",
  billingAmount: "",
  billingMeta: "",
  billingStatusKey: "paid",
  docsCounter: "8/16",
  readonly: false,
  customerId: "CUS-TC",
  groupId: "tokyo",
  groupName: "東京",
  caseType: "work",
  applicationType: "new",
  businessPhase: "MATERIAL_PREPARING",
  acceptedDate: "",
  targetDate: "",
  risk: {
    blockingCount: "0",
    blockingDetail: "",
    arrearsStatus: "なし",
    arrearsDetail: "",
    deadlineAlert: "",
    deadlineAlertDetail: "",
    lastValidation: "",
    reviewStatus: "",
  },
  nextAction: "",
  validationHint: "",
  overviewActions: {
    primary: { label: "資料管理", tab: "documents" },
    secondary: { label: "校験実行", tab: "validation" },
  },
  timeline: [],
  team: [],
  relatedParties: [],
  deadlines: [],
  billing: { total: "", received: "", outstanding: "", payments: [] },
  validation: { lastTime: "", blocking: [], warnings: [], info: [] },
  submissionPackages: [],
  correctionPackage: null,
  doubleReview: [],
  riskConfirmationRecord: null,
  documents: [],
  forms: { templates: [], generated: [] },
  tasks: [],
  logEntries: [],
  messages: [],
  providerProgress: [],
};

const ZERO_COUNTS = {
  documentItemsTotal: 0,
  documentItemsDone: 0,
  questionnaireItemsTotal: 0,
  questionnaireItemsDone: 0,
  caseParties: 0,
  tasks: 0,
  tasksPending: 0,
  communicationLogs: 0,
  submissionPackages: 0,
  generatedDocuments: 0,
  validationRuns: 0,
  reviewRecords: 0,
  billingRecords: 0,
  paymentRecords: 0,
};

function makeAgg(
  det: CaseDetail,
  o: Partial<CaseDetailAggregate> = {},
): CaseDetailAggregate {
  return {
    detail: det,
    tabCounts: { ...ZERO_COUNTS },
    customerId: det.customerId,
    customerName: det.client,
    groupId: det.groupId,
    groupName: det.groupName,
    ownerUserId: "u1",
    ownerDisplayName: det.owner,
    assistantUserId: null,
    assistantDisplayName: null,
    ...o,
  };
}

function stubRepo(
  detail: CaseDetail,
  opts: {
    tasks?: () => Promise<unknown[]>;
    deadlines?: () => Promise<unknown[]>;
  } = {},
) {
  const agg = makeAgg(detail);
  return {
    getDetailAggregate: vi.fn(async () => agg),
    getTasks: vi.fn(opts.tasks ?? (async () => [])),
    getDeadlines: vi.fn(opts.deadlines ?? (async () => [])),
    getMessages: vi.fn(async () => []),
    getLogEntries: vi.fn(async () => []),
    getDocumentItems: vi.fn(async () => []),
    getGeneratedDocuments: vi.fn(async () => ({
      templates: [],
      generated: [],
    })),
    getValidationData: vi.fn(async () => ({
      lastTime: "",
      blocking: [],
      warnings: [],
      info: [],
    })),
    getBillingData: vi.fn(async () => ({
      total: "—",
      received: "¥0",
      outstanding: "¥0",
      payments: [],
    })),
    getSubmissionPackages: vi.fn(async () => []),
    getDoubleReviewEntries: vi.fn(async () => []),
  } as unknown as CaseRepository;
}

describe("tasks/deadlines tab counter derivation on refresh (p0-fe-006d-03)", () => {
  const taskItem = (id: string, done: boolean) => ({
    id,
    label: id,
    done,
    status: done ? "completed" : "pending",
    due: "",
    assignee: "U",
    color: "primary",
    dueColor: "muted",
  });

  const deadlineItem = (id: number, severity: string) => ({
    id,
    title: `D${id}`,
    desc: "",
    date: "",
    remaining: "",
    severity,
  });

  it("tasks counter shows pending count with warning tone", async () => {
    const repo = stubRepo(BASE_DETAIL, {
      tasks: async () => [
        taskItem("t1", false),
        taskItem("t2", true),
        taskItem("t3", false),
      ],
    });
    const model = useCaseDetailModel(ref("CASE-TC"), { repo });
    await flushAll();
    expect(model.tabCounters.value.tasks).toBeDefined();
    expect(model.tabCounters.value.tasks!.label).toBe("待办2");
    expect(model.tabCounters.value.tasks!.tone).toBe("warning");
  });

  it("tasks counter absent when all tasks are done", async () => {
    const repo = stubRepo(BASE_DETAIL, {
      tasks: async () => [taskItem("t1", true), taskItem("t2", true)],
    });
    const model = useCaseDetailModel(ref("CASE-TC"), { repo });
    await flushAll();
    expect(model.tabCounters.value.tasks).toBeUndefined();
  });

  it("tasks counter absent when task list is empty", async () => {
    const repo = stubRepo(BASE_DETAIL);
    const model = useCaseDetailModel(ref("CASE-TC"), { repo });
    await flushAll();
    expect(model.tabCounters.value.tasks).toBeUndefined();
  });

  it("deadlines counter shows urgent count with warning tone", async () => {
    const repo = stubRepo(BASE_DETAIL, {
      deadlines: async () => [
        deadlineItem(1, "danger"),
        deadlineItem(2, "warning"),
        deadlineItem(3, "primary"),
        deadlineItem(4, "muted"),
      ],
    });
    const model = useCaseDetailModel(ref("CASE-TC"), { repo });
    await flushAll();
    expect(model.tabCounters.value.deadlines).toBeDefined();
    expect(model.tabCounters.value.deadlines!.label).toBe("2");
    expect(model.tabCounters.value.deadlines!.tone).toBe("warning");
  });

  it("deadlines counter absent when no urgent deadlines", async () => {
    const repo = stubRepo(BASE_DETAIL, {
      deadlines: async () => [
        deadlineItem(1, "primary"),
        deadlineItem(2, "muted"),
      ],
    });
    const model = useCaseDetailModel(ref("CASE-TC"), { repo });
    await flushAll();
    expect(model.tabCounters.value.deadlines).toBeUndefined();
  });

  it("deadlines counter absent when deadline list is empty", async () => {
    const repo = stubRepo(BASE_DETAIL);
    const model = useCaseDetailModel(ref("CASE-TC"), { repo });
    await flushAll();
    expect(model.tabCounters.value.deadlines).toBeUndefined();
  });

  it("counters update after refetch with new data", async () => {
    let callCount = 0;
    const repo = {
      getDetailAggregate: vi.fn(async () => makeAgg(BASE_DETAIL)),
      getTasks: vi.fn(async () => {
        callCount++;
        if (callCount === 1) return [];
        return [taskItem("t1", false)];
      }),
      getDeadlines: vi.fn(async () => []),
      getMessages: vi.fn(async () => []),
      getLogEntries: vi.fn(async () => []),
      getDocumentItems: vi.fn(async () => []),
      getGeneratedDocuments: vi.fn(async () => ({
        templates: [],
        generated: [],
      })),
      getValidationData: vi.fn(async () => ({
        lastTime: "",
        blocking: [],
        warnings: [],
        info: [],
      })),
      getBillingData: vi.fn(async () => ({
        total: "—",
        received: "¥0",
        outstanding: "¥0",
        payments: [],
      })),
      getSubmissionPackages: vi.fn(async () => []),
      getDoubleReviewEntries: vi.fn(async () => []),
    } as unknown as CaseRepository;

    const model = useCaseDetailModel(ref("CASE-TC"), { repo });
    await flushAll();
    expect(model.tabCounters.value.tasks).toBeUndefined();

    await model.refetch();
    await flushAll();
    expect(model.tabCounters.value.tasks).toBeDefined();
    expect(model.tabCounters.value.tasks!.label).toBe("待办1");
  });
});
