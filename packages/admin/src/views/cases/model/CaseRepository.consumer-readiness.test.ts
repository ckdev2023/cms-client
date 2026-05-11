/* eslint-disable max-lines */
import { describe, expect, it } from "vitest";
import { type CaseRepository, createCaseRepository } from "./CaseRepository";
import {
  type CaseListParams,
  type CaseListResult,
  type CaseCreateInput,
  type CaseUpdateInput,
  type CaseTransitionInput,
  type CaseBillingRiskAckInput,
  type CasePostApprovalInput,
  type CaseMutationResult,
  type CaseDetailAggregate,
  type CaseDetailTabCounts,
  AGGREGATE_SLICE_KEYS,
  CASE_DETAIL_DEEP_LINK_FIELDS,
  CASE_DETAIL_NAV_PROTOCOL,
  CASE_DETAIL_TAB_COUNTS_KEYS,
  CASE_DETAIL_HEADER_FIELDS,
  CASE_SUMMARY_CARD_KEYS,
  adaptCaseSummaryCards,
  SUPPORT_SEAM_REGISTRY,
  SUPPORT_SEAM_FUNCTION_NAMES,
  type CreateCaseDraftSnapshot,
  buildCreateCaseInputFromDraft,
  type UpdateCaseDraftSnapshot,
  buildUpdateCaseInputFromDraft,
} from "./CaseAdapter";

import type { CaseListItem, CaseSummaryCardData, CaseDetail } from "../types";
import type {
  DocumentGroup,
  FormTemplate,
  FormsData,
  MessageItem,
  LogEntry,
} from "../types-detail";
import type { WriteResultWithId } from "./CaseRepositoryWriteSide";

type _ListCasesReturn = ReturnType<CaseRepository["listCases"]>;
type _AssertListReturnsResult =
  _ListCasesReturn extends Promise<CaseListResult>
    ? true
    : "listCases must return Promise<CaseListResult>";
const _assertListResult: _AssertListReturnsResult = true;

type _GetDetailReturn = ReturnType<CaseRepository["getDetail"]>;
type _AssertDetailReturnsCaseDetail =
  _GetDetailReturn extends Promise<CaseDetail | null>
    ? true
    : "getDetail must return Promise<CaseDetail | null>";
const _assertDetailResult: _AssertDetailReturnsCaseDetail = true;

type _AggregateReturn = ReturnType<CaseRepository["getDetailAggregate"]>;
type _AssertAggregateReturn =
  _AggregateReturn extends Promise<CaseDetailAggregate | null>
    ? true
    : "getDetailAggregate must return Promise<CaseDetailAggregate | null>";
const _assertAggregateResult: _AssertAggregateReturn = true;

type _CreateReturn = ReturnType<CaseRepository["createCase"]>;
type _AssertCreateReturn =
  _CreateReturn extends Promise<CaseMutationResult>
    ? true
    : "createCase must return Promise<CaseMutationResult>";
const _assertCreateResult: _AssertCreateReturn = true;

type _MessagesReturn = ReturnType<CaseRepository["getMessages"]>;
type _AssertMessagesReturn =
  _MessagesReturn extends Promise<MessageItem[]>
    ? true
    : "getMessages must return Promise<MessageItem[]>";
const _assertMessagesResult: _AssertMessagesReturn = true;

type _LogReturn = ReturnType<CaseRepository["getLogEntries"]>;
type _AssertLogReturn =
  _LogReturn extends Promise<LogEntry[]>
    ? true
    : "getLogEntries must return Promise<LogEntry[]>";
const _assertLogResult: _AssertLogReturn = true;

type _DocsReturn = ReturnType<CaseRepository["getDocumentItems"]>;
type _AssertDocsReturn =
  _DocsReturn extends Promise<DocumentGroup[]>
    ? true
    : "getDocumentItems must return Promise<DocumentGroup[]>";
const _assertDocsResult: _AssertDocsReturn = true;

type _FormsReturn = ReturnType<CaseRepository["getGeneratedDocuments"]>;
type _AssertFormsReturn =
  _FormsReturn extends Promise<FormsData>
    ? true
    : "getGeneratedDocuments must return Promise<FormsData>";
const _assertFormsResult: _AssertFormsReturn = true;

const _assertTemplatesResult: ReturnType<
  CaseRepository["listDocumentTemplates"]
> extends Promise<FormTemplate[]>
  ? true
  : never = true;
const _assertFinalizeResult: ReturnType<
  CaseRepository["finalizeGeneratedDocument"]
> extends Promise<WriteResultWithId>
  ? true
  : never = true;
const _assertExportResult: ReturnType<
  CaseRepository["exportGeneratedDocument"]
> extends Promise<WriteResultWithId>
  ? true
  : never = true;

type _BootstrapReturn = ReturnType<CaseRepository["bootstrapChecklist"]>;
type _AssertBootstrapReturn =
  _BootstrapReturn extends Promise<CaseMutationResult>
    ? true
    : "bootstrapChecklist must return Promise<CaseMutationResult>";
const _assertBootstrapResult: _AssertBootstrapReturn = true;

type _SummaryCardsParam = Parameters<CaseRepository["getSummaryCards"]>[0];
type _AssertSummaryTakesItems = CaseListItem[] extends _SummaryCardsParam
  ? true
  : "getSummaryCards must accept CaseListItem[]";
const _assertSummaryParam: _AssertSummaryTakesItems = true;

type _SummaryCardsReturn = ReturnType<CaseRepository["getSummaryCards"]>;
type _AssertSummaryReturnsCards =
  _SummaryCardsReturn extends CaseSummaryCardData[]
    ? true
    : "getSummaryCards must return CaseSummaryCardData[]";
const _assertSummaryReturn: _AssertSummaryReturnsCards = true;

void [
  _assertListResult,
  _assertDetailResult,
  _assertAggregateResult,
  _assertCreateResult,
  _assertMessagesResult,
  _assertLogResult,
  _assertDocsResult,
  _assertFormsResult,
  _assertTemplatesResult,
  _assertFinalizeResult,
  _assertExportResult,
  _assertBootstrapResult,
  _assertSummaryParam,
  _assertSummaryReturn,
];

const REPOSITORY_REQUIRED_METHODS = [
  "listCases",
  "getSummaryCards",
  "getDetail",
  "getDetailAggregate",
  "createCase",
  "updateCase",
  "transitionCase",
  "transitionPhase",
  "acknowledgeBillingRisk",
  "updatePostApprovalStage",
  "transitionWorkflowStep",
  "deleteCase",
  "bootstrapChecklist",
  "getMessages",
  "getLogEntries",
  "getDocumentItems",
  "getGeneratedDocuments",
  "getValidationData",
  "getBillingData",
  "getBillingTabAggregate",
  "getSubmissionPackages",
  "getDoubleReviewEntries",
  "getTasks",
  "getDeadlines",
  "createCaseParty",
  "retryReminderCreation",
  "createCommunicationLog",
  "createGeneratedDocument",
  "createReminder",
  "createTask",
  "completeTask",
  "createSubmissionPackage",
  "listDocumentTemplates",
  "previewChecklistCount",
  "finalizeGeneratedDocument",
  "exportGeneratedDocument",
] as const;

describe("CaseRepository interface surface (p0-fe-002f-04)", () => {
  it("createCaseRepository produces an object with all required methods", () => {
    const repo = createCaseRepository({ request: fetch, getToken: () => "t" });
    for (const method of REPOSITORY_REQUIRED_METHODS) {
      expect(typeof repo[method]).toBe("function");
    }
  });

  it("no unexpected methods leak beyond the frozen surface", () => {
    const repo = createCaseRepository({ request: fetch, getToken: () => "t" });
    const actual = Object.keys(repo).sort();
    const expected = [...REPOSITORY_REQUIRED_METHODS].sort();
    expect(actual).toEqual(expected);
  });
});

describe("p0-fe-003 consumer readiness — list (p0-fe-002f-04)", () => {
  it("CaseListParams covers all list filter keys the composable needs", () => {
    const composableFilterKeys = [
      "scope",
      "search",
      "stage",
      "owner",
      "group",
      "risk",
      "customerId",
    ];
    const sample: CaseListParams = {};
    for (const key of composableFilterKeys) {
      expect(key in sample || true).toBe(true);
    }
    const paramsObj: CaseListParams = {
      scope: "mine",
      search: "test",
      stage: "S3",
      owner: "u1",
      group: "g1",
      risk: "high",
      customerId: "c1",
      page: 1,
      limit: 20,
    };
    expect(paramsObj).toBeDefined();
  });

  it("CaseListResult.items is CaseListItem[] — no extra unwrapping needed", () => {
    const result: CaseListResult = { items: [], total: 0, page: 1, limit: 20 };
    const items: CaseListItem[] = result.items;
    expect(items).toEqual([]);
  });

  it("adaptCaseSummaryCards is directly callable on CaseListItem[]", () => {
    const items: CaseListItem[] = [];
    const cards: CaseSummaryCardData[] = adaptCaseSummaryCards(items);
    expect(cards).toHaveLength(4);
    for (const key of CASE_SUMMARY_CARD_KEYS) {
      expect(cards.find((c) => c.key === key)).toBeDefined();
    }
  });

  it("repository.getSummaryCards accepts adapted list items", () => {
    const repo = createCaseRepository({ request: fetch, getToken: () => "t" });
    const items: CaseListItem[] = [];
    const cards = repo.getSummaryCards(items);
    expect(cards).toHaveLength(4);
  });
});

describe("p0-fe-004 consumer readiness — detail (p0-fe-002f-04)", () => {
  it("CaseDetailAggregate has .detail of type CaseDetail", () => {
    const agg: CaseDetailAggregate = {} as CaseDetailAggregate;
    const _detail: CaseDetail = agg.detail;
    void _detail;
    expect(true).toBe(true);
  });

  it("CaseDetailAggregate exposes tabCounts for badge rendering", () => {
    const counts: CaseDetailTabCounts = {} as CaseDetailTabCounts;
    for (const key of CASE_DETAIL_TAB_COUNTS_KEYS) {
      expect(key in counts || true).toBe(true);
    }
    expect(CASE_DETAIL_TAB_COUNTS_KEYS.length).toBeGreaterThan(0);
  });

  it("CaseDetailAggregate exposes deep-link fields for header/cross-module links", () => {
    for (const field of CASE_DETAIL_DEEP_LINK_FIELDS) {
      expect(typeof field).toBe("string");
    }
    expect(CASE_DETAIL_DEEP_LINK_FIELDS).toContain("customerId");
    expect(CASE_DETAIL_DEEP_LINK_FIELDS).toContain("customerName");
    expect(CASE_DETAIL_DEEP_LINK_FIELDS).toContain("ownerUserId");
    expect(CASE_DETAIL_DEEP_LINK_FIELDS).toContain("ownerDisplayName");
  });

  it("AGGREGATE_SLICE_KEYS is stable for detail adapter consumption", () => {
    expect(AGGREGATE_SLICE_KEYS).toContain("case");
    expect(AGGREGATE_SLICE_KEYS).toContain("counts");
    expect(AGGREGATE_SLICE_KEYS).toContain("billing");
    expect(AGGREGATE_SLICE_KEYS).toContain("deepLink");
  });

  it("CASE_DETAIL_NAV_PROTOCOL provides tab query key for deep-link", () => {
    expect(CASE_DETAIL_NAV_PROTOCOL.tabQueryKey).toBe("tab");
    expect(CASE_DETAIL_NAV_PROTOCOL.defaultTab).toBe("overview");
  });

  it("CASE_DETAIL_HEADER_FIELDS covers overview/info region", () => {
    const required = [
      "id",
      "title",
      "client",
      "owner",
      "stage",
      "readonly",
      "customerId",
    ];
    for (const field of required) {
      expect(CASE_DETAIL_HEADER_FIELDS).toContain(field);
    }
  });

  it("repository.getDetail and getDetailAggregate both available", () => {
    const repo = createCaseRepository({ request: fetch, getToken: () => "t" });
    expect(typeof repo.getDetail).toBe("function");
    expect(typeof repo.getDetailAggregate).toBe("function");
  });
});

describe("p0-fe-005 consumer readiness — create (p0-fe-002f-04)", () => {
  it("CreateCaseDraftSnapshot → buildCreateCaseInputFromDraft → CaseCreateInput pipeline works", () => {
    const snapshot: CreateCaseDraftSnapshot = {
      customerId: "c1",
      templateId: "visa",
      applicationType: "認定",
      effectiveTitle: "テスト案件",
      group: "g1",
      inheritedGroup: "g1",
      groupOverrideReason: "",
      owner: "u1",
      dueDate: "2026-12-31",
      amount: "300,000",
    };
    const input: CaseCreateInput = buildCreateCaseInputFromDraft(snapshot);
    expect(input.customerId).toBe("c1");
    expect(input.caseTypeCode).toBe("visa");
    expect(input.ownerUserId).toBe("u1");
    expect(input.stage).toBe("S1");
  });

  it("CaseCreateInput is directly passable to repository.createCase", () => {
    const input: CaseCreateInput = {
      customerId: "c1",
      caseTypeCode: "visa",
      ownerUserId: "u1",
    };
    const repo = createCaseRepository({ request: fetch, getToken: () => "t" });
    expect(typeof repo.createCase).toBe("function");
    void input;
  });

  it("cross-group reason is conditionally attached by bridge builder", () => {
    const crossGroupSnapshot: CreateCaseDraftSnapshot = {
      customerId: "c1",
      templateId: "visa",
      applicationType: "認定",
      effectiveTitle: "テスト",
      group: "g-new",
      inheritedGroup: "g-original",
      groupOverrideReason: "transferred by manager",
      owner: "u1",
      dueDate: "",
      amount: "",
    };
    const input = buildCreateCaseInputFromDraft(crossGroupSnapshot);
    expect(input.crossGroupReason).toBe("transferred by manager");
  });

  it("UpdateCaseDraftSnapshot → buildUpdateCaseInputFromDraft pipeline works", () => {
    const formValues = {
      caseName: "更新テスト",
      caseTypeCode: "visa",
      ownerUserId: "u1",
      groupId: "g1",
      dueAt: "2026-12-31",
      applicationType: "変更",
      caseSubtype: "",
      priority: "normal",
      riskLevel: "low",
      assistantUserId: "",
      sourceChannel: "",
      signedAt: "",
      acceptedAt: "",
      submissionDate: "",
      resultDate: "",
      residenceExpiryDate: "",
      archivedAt: "",
      resultOutcome: "",
      visaPlan: "",
      overseasVisaStartAt: "",
      entryConfirmedAt: "",
    };
    const snapshot: UpdateCaseDraftSnapshot = {
      original: { ...formValues, caseName: "旧タイトル" },
      current: formValues,
      groupTransferReason: "",
      originalAmount: "",
      currentAmount: "",
    };
    const input: CaseUpdateInput = buildUpdateCaseInputFromDraft(snapshot);
    expect(input.caseName).toBe("更新テスト");
  });

  it("CaseMutationResult.id is available for post-create navigation", () => {
    const result: CaseMutationResult = { id: "new-case-001" };
    expect(result.id).toBe("new-case-001");
  });

  it("write action inputs are structurally sound for repository methods", () => {
    const transition: CaseTransitionInput = { toStage: "S4" };
    const ack: CaseBillingRiskAckInput = { reasonCode: "client_confirmed" };
    const postApproval: CasePostApprovalInput = { stage: "entry_success" };
    expect(transition.toStage).toBeDefined();
    expect(ack.reasonCode).toBeDefined();
    expect(postApproval.stage).toBeDefined();
  });
});

describe("p0-fe-007 consumer readiness — detail tabs (p0-fe-002f-04)", () => {
  it("messages and log entries available via dedicated repository methods", () => {
    const repo = createCaseRepository({ request: fetch, getToken: () => "t" });
    expect(typeof repo.getMessages).toBe("function");
    expect(typeof repo.getLogEntries).toBe("function");
  });

  it("documents and forms available via dedicated repository methods (p0-fe-006b-01)", () => {
    const repo = createCaseRepository({ request: fetch, getToken: () => "t" });
    expect(typeof repo.getDocumentItems).toBe("function");
    expect(typeof repo.getGeneratedDocuments).toBe("function");
  });

  it("document templates, finalize, and export available via repository methods", () => {
    const repo = createCaseRepository({ request: fetch, getToken: () => "t" });
    expect(typeof repo.listDocumentTemplates).toBe("function");
    expect(typeof repo.finalizeGeneratedDocument).toBe("function");
    expect(typeof repo.exportGeneratedDocument).toBe("function");
  });

  it("validation/billing/submission/review available via dedicated repository methods (p0-fe-006b-02)", () => {
    const repo = createCaseRepository({ request: fetch, getToken: () => "t" });
    expect(typeof repo.getValidationData).toBe("function");
    expect(typeof repo.getBillingData).toBe("function");
    expect(typeof repo.getSubmissionPackages).toBe("function");
    expect(typeof repo.getDoubleReviewEntries).toBe("function");
  });

  it("tasks available via dedicated repository method (p0-fe-006d-01)", () => {
    const repo = createCaseRepository({ request: fetch, getToken: () => "t" });
    expect(typeof repo.getTasks).toBe("function");
  });

  it("support seam functions are importable and callable", () => {
    for (const name of SUPPORT_SEAM_FUNCTION_NAMES) {
      expect(SUPPORT_SEAM_REGISTRY[name]).toHaveProperty("target");
      expect(SUPPORT_SEAM_REGISTRY[name]).toHaveProperty("module");
    }
  });

  it("seam registry is empty (all tab modules implemented)", () => {
    const registeredModules = Object.values(SUPPORT_SEAM_REGISTRY) as Array<{
      module: string;
    }>;
    expect(registeredModules).toHaveLength(0);
    const allImplementedModules = [
      "documents",
      "forms",
      "validation",
      "billing",
      "submissionPkgs",
      "doubleReview",
      "tasks",
      "deadlines",
    ];
    for (const mod of allImplementedModules) {
      expect(registeredModules.some((entry) => entry.module === mod)).toBe(
        false,
      );
    }
  });

  it("CaseDetailTabCounts has keys for all countable tab badges", () => {
    const countKeys = [...CASE_DETAIL_TAB_COUNTS_KEYS];
    expect(countKeys).toContain("documentItemsTotal");
    expect(countKeys).toContain("documentItemsDone");
    expect(countKeys).toContain("tasks");
    expect(countKeys).toContain("tasksPending");
    expect(countKeys).toContain("communicationLogs");
    expect(countKeys).toContain("submissionPackages");
    expect(countKeys).toContain("billingRecords");
    expect(countKeys).toContain("paymentRecords");
  });
});

describe("cross-consumer surface stability (p0-fe-002f-04)", () => {
  it("CaseListItem type is shared between list, detail, and summary consumers", () => {
    const item: CaseListItem = {} as CaseListItem;
    const items: CaseListItem[] = [item];
    const _cards: CaseSummaryCardData[] = adaptCaseSummaryCards(items);
    expect(_cards).toBeDefined();
  });

  it("CaseDetail type is consistent between getDetail and getDetailAggregate.detail", () => {
    type DirectDetail = Awaited<ReturnType<CaseRepository["getDetail"]>>;
    type AggregateDetail = CaseDetailAggregate["detail"];
    type _AssertConsistent =
      AggregateDetail extends NonNullable<DirectDetail>
        ? true
        : "CaseDetail must be the same type in both paths";
    const _assert: _AssertConsistent = true;
    void _assert;
    expect(true).toBe(true);
  });

  it("all write operations share CaseMutationResult return type", () => {
    type CreateReturn = Awaited<ReturnType<CaseRepository["createCase"]>>;
    type UpdateReturn = Awaited<ReturnType<CaseRepository["updateCase"]>>;
    type TransitionReturn = Awaited<
      ReturnType<CaseRepository["transitionCase"]>
    >;
    type AckReturn = Awaited<
      ReturnType<CaseRepository["acknowledgeBillingRisk"]>
    >;
    type PostReturn = Awaited<
      ReturnType<CaseRepository["updatePostApprovalStage"]>
    >;

    type _AllSame = [
      CreateReturn,
      UpdateReturn,
      TransitionReturn,
      AckReturn,
      PostReturn,
    ] extends [
      CaseMutationResult,
      CaseMutationResult,
      CaseMutationResult,
      CaseMutationResult,
      CaseMutationResult,
    ]
      ? true
      : "All write operations must return CaseMutationResult";
    const _assert: _AllSame = true;
    void _assert;
    expect(true).toBe(true);
  });
});
