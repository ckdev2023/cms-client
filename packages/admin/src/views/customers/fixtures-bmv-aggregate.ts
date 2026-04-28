import type { CustomerBmvAggregate } from "./types-bmv";

export const SAMPLE_BMV_AGGREGATE_SIGNED: CustomerBmvAggregate = {
  profile: {
    questionnaireStatus: "returned",
    quoteStatus: "confirmed",
    signStatus: "signed",
    intakeStatus: "ready_for_case_creation",
    questionnaireSentAt: "2026-04-01T09:00:00+09:00",
    questionnaireReturnedAt: "2026-04-05T20:15:00+09:00",
    quoteGeneratedAt: "2026-04-07T11:30:00+09:00",
    quoteConfirmedAt: "2026-04-09T18:00:00+09:00",
    signedAt: "2026-04-10T10:45:00+09:00",
    note: null,
    sourceLeadId: "lead-bmv-004",
    leadGroupId: "tokyo-1",
    leadOwnerUserId: "takahashi-k",
  },
  quoteHistory: [
    {
      id: "quote-v1",
      version: 1,
      amount: "¥350,000",
      createdAt: "2026-04-07T11:30:00+09:00",
      isCurrent: false,
    },
    {
      id: "quote-v2",
      version: 2,
      amount: "¥380,000",
      createdAt: "2026-04-09T14:00:00+09:00",
      isCurrent: true,
    },
  ],
  surveyDataSummary: {
    completedAt: "2026-04-05T20:15:00+09:00",
    fieldCount: 24,
    highlightFields: [
      { label: "会社名", value: "ABC株式会社" },
      { label: "事業内容", value: "飲食業" },
      { label: "資本金", value: "¥5,000,000" },
    ],
  },
  linkedCase: null,
  reminders: [],
};

export const SAMPLE_BMV_AGGREGATE_WITH_CASE: CustomerBmvAggregate = {
  ...SAMPLE_BMV_AGGREGATE_SIGNED,
  linkedCase: {
    caseId: "CASE-2026-0601",
    caseName: "佐藤美咲｜経営管理認定",
    stage: "資料収集中",
    postApprovalStage: null,
    coeStatus: null,
    coeIssuedAt: null,
    coeExpiresAt: null,
  },
  reminders: [
    {
      id: "rem-001",
      type: "COE 期限確認",
      dueAt: "2026-07-01T09:00:00+09:00",
      status: "pending",
    },
  ],
};

export const SAMPLE_BMV_AGGREGATE_POST_APPROVAL: CustomerBmvAggregate = {
  ...SAMPLE_BMV_AGGREGATE_WITH_CASE,
  linkedCase: {
    caseId: "CASE-2026-0601",
    caseName: "佐藤美咲｜経営管理認定",
    stage: "入管提出済み",
    postApprovalStage: "COE 発行待ち",
    coeStatus: "pending",
    coeIssuedAt: null,
    coeExpiresAt: null,
  },
  reminders: [
    {
      id: "rem-001",
      type: "COE 期限確認",
      dueAt: "2026-07-01T09:00:00+09:00",
      status: "pending",
    },
    {
      id: "rem-002",
      type: "在留カード受領確認",
      dueAt: "2026-08-15T09:00:00+09:00",
      status: "scheduled",
    },
  ],
};
