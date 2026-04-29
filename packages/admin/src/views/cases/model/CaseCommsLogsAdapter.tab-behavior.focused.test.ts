import { describe, expect, it, vi } from "vitest";
import { ref, nextTick } from "vue";
import {
  adaptCaseMessageDto,
  adaptCaseLogDto,
  buildCaseMessagesUrl,
  buildCaseLogEntriesUrl,
} from "./CaseCommsLogsAdapter";
import { useCaseDetailModel } from "./useCaseDetailModel";
import type { CaseRepository } from "./CaseRepository";
import type { CaseDetail } from "../types";
import type { CaseDetailAggregate } from "./CaseAdapterDetailContracts";
import { buildCustomerDetailHref } from "../query";

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

const BASE_DETAIL: CaseDetail = {
  id: "CASE-MSG",
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
  docsCounter: "",
  readonly: false,
  customerId: "CUS-001",
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
    arrearsStatus: "cases.detail.arrearsNo",
    arrearsDetail: "",
    deadlineAlert: "",
    deadlineAlertDetail: "",
    lastValidation: "",
    reviewStatus: "",
  },
  nextAction: "",
  validationHint: "",
  overviewActions: {
    primary: { label: "cases.coach.docManagement", tab: "documents" },
    secondary: { label: "cases.coach.runValidation", tab: "validation" },
  },
  timeline: [],
  team: [],
  relatedParties: [],
  deadlines: [] as CaseDetail["deadlines"],
  billing: { total: "", received: "", outstanding: "", payments: [] },
  validation: {
    lastTime: "",
    blocking: [] as CaseDetail["validation"]["blocking"],
    warnings: [],
    info: [],
  },
  submissionPackages: [],
  correctionPackage: null,
  doubleReview: [],
  riskConfirmationRecord: null,
  documents: [],
  forms: { templates: [], generated: [] },
  tasks: [] as CaseDetail["tasks"],
  logEntries: [],
  messages: [],
  providerProgress: [],
};

function det(o: Partial<CaseDetail> = {}): CaseDetail {
  return { ...BASE_DETAIL, ...o };
}

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

function agg(
  d: CaseDetail,
  o: Partial<CaseDetailAggregate> = {},
): CaseDetailAggregate {
  return {
    detail: d,
    tabCounts: { ...ZERO_COUNTS },
    customerId: d.customerId,
    customerName: d.client,
    groupId: d.groupId,
    groupName: d.groupName,
    ownerUserId: "u1",
    ownerDisplayName: d.owner,
    assistantUserId: null,
    assistantDisplayName: null,
    ...o,
  };
}

function stubRepo(
  handler: (id: string) => Promise<CaseDetailAggregate | null>,
) {
  return {
    getDetailAggregate: vi.fn(handler),
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
    getTasks: vi.fn(async () => []),
    getDeadlines: vi.fn(async () => []),
    getMessages: vi.fn(async () => []),
    getLogEntries: vi.fn(async () => []),
  } as unknown as CaseRepository;
}

const commLog = (o: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "comm-f01",
  channelType: "phone",
  contentSummary: "電話でフォロー",
  createdAt: "2026-04-10T10:00:00.000Z",
  createdBy: "Tanaka Yuki",
  visibleToClient: false,
  followUpRequired: false,
  ...o,
});

const timelineLog = (
  o: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: "tl-f01",
  action: "case.created",
  actorUserId: "user-abc",
  payload: { caseTypeCode: "business_manager" },
  createdAt: "2026-04-10T09:00:00.000Z",
  ...o,
});

describe("tab switching messages/log (p0-fe-006c-03)", () => {
  const AGG = agg(det());

  function model(
    overrides: Partial<Parameters<typeof useCaseDetailModel>[1]> = {},
  ) {
    const repo = stubRepo(async () => AGG);
    return useCaseDetailModel(ref("CASE-MSG"), { repo, ...overrides });
  }

  it("switchTab('messages') updates activeTab and fires onTabChange", async () => {
    const calls: string[] = [];
    const m = model({ onTabChange: (t) => calls.push(t) });
    await flushFetch();
    m.switchTab("messages");
    expect(m.activeTab.value).toBe("messages");
    expect(calls).toEqual(["messages"]);
  });

  it("switchTab('log') updates activeTab and fires onTabChange", async () => {
    const calls: string[] = [];
    const m = model({ onTabChange: (t) => calls.push(t) });
    await flushFetch();
    m.switchTab("log");
    expect(m.activeTab.value).toBe("log");
    expect(calls).toEqual(["log"]);
  });

  it("switching messages→log fires onTabChange exactly once", async () => {
    const calls: string[] = [];
    const m = model({ onTabChange: (t) => calls.push(t) });
    await flushFetch();
    m.switchTab("messages");
    m.switchTab("log");
    expect(calls).toEqual(["messages", "log"]);
    expect(m.activeTab.value).toBe("log");
  });

  it("switching to same tab is idempotent (no-op)", async () => {
    const calls: string[] = [];
    const m = model({ onTabChange: (t) => calls.push(t) });
    await flushFetch();
    m.switchTab("messages");
    m.switchTab("messages");
    expect(calls).toEqual(["messages"]);
  });

  it("switching overview→messages→overview round-trips correctly", async () => {
    const calls: string[] = [];
    const m = model({ onTabChange: (t) => calls.push(t) });
    await flushFetch();
    expect(m.activeTab.value).toBe("overview");
    m.switchTab("messages");
    expect(m.activeTab.value).toBe("messages");
    m.switchTab("overview");
    expect(m.activeTab.value).toBe("overview");
    expect(calls).toEqual(["messages", "overview"]);
  });

  it("messages tab counter shows count when messages present", async () => {
    const msg = adaptCaseMessageDto(commLog())!;
    const msg2 = adaptCaseMessageDto(commLog({ id: "comm-f02" }))!;
    const msgs = [msg, msg2];
    const repo = stubRepo(async () => agg(det()));
    repo.getMessages = vi.fn(async () => msgs);
    const m = useCaseDetailModel(ref("CASE-MSG"), { repo });
    await flushFetch();
    await new Promise<void>((r) => setTimeout(r, 20));
    await flushFetch();
    expect(m.tabCounters.value.messages).toEqual({
      label: "2",
      tone: "default",
    });
  });

  it("messages tab counter absent when messages empty", async () => {
    const m = model();
    await flushFetch();
    expect(m.tabCounters.value.messages).toBeUndefined();
  });

  it("log tab has no counter by design", async () => {
    const entry = adaptCaseLogDto(timelineLog())!;
    const withLogs = det({ logEntries: [entry] });
    const repo = stubRepo(async () => agg(withLogs));
    const m = useCaseDetailModel(ref("CASE-MSG"), { repo });
    await flushFetch();
    expect(m.tabCounters.value.log).toBeUndefined();
  });

  it("routeTab sync: external URL change to messages updates activeTab without firing onTabChange", async () => {
    const calls: string[] = [];
    const routeTab = ref<string | undefined>(undefined);
    const repo = stubRepo(async () => AGG);
    const m = useCaseDetailModel(ref("CASE-MSG"), {
      repo,
      routeTab,
      onTabChange: (t) => calls.push(t),
    });
    await flushFetch();
    expect(m.activeTab.value).toBe("overview");

    routeTab.value = "messages";
    await nextTick();
    expect(m.activeTab.value).toBe("messages");
    expect(calls).toEqual([]);
  });

  it("routeTab sync: external URL change to log updates activeTab without firing onTabChange", async () => {
    const calls: string[] = [];
    const routeTab = ref<string | undefined>(undefined);
    const repo = stubRepo(async () => AGG);
    const m = useCaseDetailModel(ref("CASE-MSG"), {
      repo,
      routeTab,
      onTabChange: (t) => calls.push(t),
    });
    await flushFetch();

    routeTab.value = "log";
    await nextTick();
    expect(m.activeTab.value).toBe("log");
    expect(calls).toEqual([]);
  });
});

describe("back-link stability across tab switches (p0-fe-006c-03)", () => {
  const AGG = agg(det({ customerId: "CUS-BACKLINK" }));

  it("customerId stays stable when switching to messages tab", async () => {
    const repo = stubRepo(async () => AGG);
    const m = useCaseDetailModel(ref("CASE-MSG"), { repo });
    await flushFetch();
    expect(m.customerId.value).toBe("CUS-BACKLINK");
    m.switchTab("messages");
    expect(m.customerId.value).toBe("CUS-BACKLINK");
  });

  it("customerId stays stable when switching to log tab", async () => {
    const repo = stubRepo(async () => AGG);
    const m = useCaseDetailModel(ref("CASE-MSG"), { repo });
    await flushFetch();
    expect(m.customerId.value).toBe("CUS-BACKLINK");
    m.switchTab("log");
    expect(m.customerId.value).toBe("CUS-BACKLINK");
  });

  it("customerId survives full tab round-trip: overview→messages→log→overview", async () => {
    const repo = stubRepo(async () => AGG);
    const m = useCaseDetailModel(ref("CASE-MSG"), { repo });
    await flushFetch();
    m.switchTab("messages");
    m.switchTab("log");
    m.switchTab("overview");
    expect(m.customerId.value).toBe("CUS-BACKLINK");
  });

  it("buildCustomerDetailHref remains correct across tab transitions", async () => {
    const repo = stubRepo(async () => AGG);
    const m = useCaseDetailModel(ref("CASE-MSG"), { repo });
    await flushFetch();
    const hrefBefore = buildCustomerDetailHref(m.customerId.value);
    m.switchTab("messages");
    m.switchTab("log");
    const hrefAfter = buildCustomerDetailHref(m.customerId.value);
    expect(hrefBefore).toBe("#/customers/CUS-BACKLINK");
    expect(hrefAfter).toBe(hrefBefore);
  });

  it("back-link to empty customerId returns customer list", () => {
    expect(buildCustomerDetailHref("")).toBe("#/customers");
  });
});

describe("URL builders (p0-fe-006c-03)", () => {
  it("buildCaseMessagesUrl produces /communication-logs path", () => {
    expect(buildCaseMessagesUrl("/api/cases", "case-001")).toBe(
      "/api/communication-logs?caseId=case-001",
    );
  });

  it("buildCaseLogEntriesUrl produces /timeline path with entityType=case", () => {
    expect(buildCaseLogEntriesUrl("/api/cases", "case-001")).toBe(
      "/api/timeline?entityType=case&entityId=case-001",
    );
  });

  it("URL builders encode special characters in caseId", () => {
    expect(buildCaseMessagesUrl("/api/cases", "a b&c")).toContain(
      "caseId=a%20b%26c",
    );
    expect(buildCaseLogEntriesUrl("/api/cases", "a b&c")).toContain(
      "entityId=a%20b%26c",
    );
  });

  it("URL builders derive prefix from custom apiPath", () => {
    expect(buildCaseMessagesUrl("/custom/cases", "c1")).toBe(
      "/custom/communication-logs?caseId=c1",
    );
    expect(buildCaseLogEntriesUrl("/custom/cases/", "c1")).toBe(
      "/custom/timeline?entityType=case&entityId=c1",
    );
  });
});
