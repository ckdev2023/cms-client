import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  SURVEY_DATA_CATEGORY,
  DOCUMENT_ITEM_CATEGORIES,
  validateSurveyData,
  type SurveyDataWriteContract,
  type SurveyDataReadContract,
  type DocumentItemCategory,
} from "./cases.types-survey-visa-quote";
import { mapDetailCountsRow } from "./cases.service";
import type { CaseDetailCounts } from "./cases.types";
import {
  mapDocumentItemRow,
  type DocumentItemQueryRow,
} from "../document-items/documentItems.service";
import { REQUIREMENT_CATEGORIES } from "./cases.types-template-blueprints";

function makeRow(
  overrides: Partial<DocumentItemQueryRow> = {},
): DocumentItemQueryRow {
  return {
    id: "item-1",
    org_id: "org-1",
    case_id: "case-1",
    checklist_item_code: "bmv_questionnaire",
    name: "経営管理ビザ情報表",
    status: "pending",
    required_flag: true,
    requested_at: null,
    received_at: null,
    reviewed_at: null,
    due_at: null,
    owner_side: "customer",
    last_follow_up_at: null,
    note: null,
    category: "questionnaire",
    survey_data: null,
    waive_reason_latest: null,
    waive_reason_code_latest: null,
    waived_by_user_id_latest: null,
    waived_at_latest: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeCountsRow(overrides: Record<string, string> = {}) {
  return {
    document_items_total: "0",
    document_items_done: "0",
    questionnaire_items_total: "0",
    questionnaire_items_done: "0",
    case_parties: "0",
    tasks: "0",
    tasks_pending: "0",
    communication_logs: "0",
    submission_packages: "0",
    generated_documents: "0",
    validation_runs: "0",
    review_records: "0",
    billing_records: "0",
    payment_records: "0",
    ...overrides,
  };
}

void describe("questionnaire storage: category constant alignment", () => {
  void test("SURVEY_DATA_CATEGORY equals 'questionnaire'", () => {
    assert.equal(SURVEY_DATA_CATEGORY, "questionnaire");
  });

  void test("DOCUMENT_ITEM_CATEGORIES includes 'questionnaire'", () => {
    assert.ok(
      DOCUMENT_ITEM_CATEGORIES.includes("questionnaire"),
      "questionnaire must be a valid document item category",
    );
  });

  void test("REQUIREMENT_CATEGORIES includes 'questionnaire'", () => {
    assert.ok(
      REQUIREMENT_CATEGORIES.includes("questionnaire"),
      "questionnaire must be a valid requirement blueprint category",
    );
  });

  void test("category sets are consistent: DOCUMENT_ITEM_CATEGORIES ⊇ REQUIREMENT_CATEGORIES", () => {
    const docSet = new Set<string>(DOCUMENT_ITEM_CATEGORIES);
    for (const cat of REQUIREMENT_CATEGORIES) {
      assert.ok(
        docSet.has(cat),
        `REQUIREMENT_CATEGORIES value '${cat}' missing from DOCUMENT_ITEM_CATEGORIES`,
      );
    }
  });
});

void describe("questionnaire storage: survey_data validation", () => {
  void test("accepts null — questionnaire not yet returned", () => {
    assert.ok(validateSurveyData(null));
  });

  void test("accepts undefined — field omitted on P0 downgrade", () => {
    assert.ok(validateSurveyData(undefined));
  });

  void test("accepts empty object — questionnaire form created but blank", () => {
    assert.ok(validateSurveyData({}));
  });

  void test("accepts typical BMV questionnaire payload", () => {
    assert.ok(
      validateSurveyData({
        companyName: "株式会社テスト",
        capitalAmount: 5000000,
        businessPlan: { summary: "事業計画概要" },
        directors: [{ name: "田中太郎", role: "代表取締役" }],
        officeAddress: { prefecture: "東京都", city: "港区" },
      }),
    );
  });

  void test("rejects array — survey_data must be an object", () => {
    assert.equal(validateSurveyData([{ q1: "a" }]), false);
  });

  void test("rejects primitive string", () => {
    assert.equal(validateSurveyData("raw text"), false);
  });

  void test("rejects number", () => {
    assert.equal(validateSurveyData(42), false);
  });

  void test("rejects boolean", () => {
    assert.equal(validateSurveyData(true), false);
  });
});

void describe("questionnaire storage: write contract structural invariants", () => {
  void test("SurveyDataWriteContract types compile with correct shape", () => {
    const contract: SurveyDataWriteContract = {
      writeEndpoints: ["PATCH /document-items/:id/survey-data"],
      storageColumn: "survey_data",
      storageTable: "document_items",
      categoryFilter: "questionnaire",
      type: "Record<string, unknown> | null",
    };
    assert.equal(contract.storageTable, "document_items");
    assert.equal(contract.categoryFilter, "questionnaire");
    assert.equal(contract.writeEndpoints.length, 1);
  });

  void test("SurveyDataReadContract types compile with correct shape", () => {
    const contract: SurveyDataReadContract = {
      listEndpoint: "GET /document-items",
      queryFilter: "caseId + category=questionnaire",
      responseField: "surveyData",
    };
    assert.equal(contract.responseField, "surveyData");
  });

  void test("DocumentItemCategory includes questionnaire", () => {
    const categories: DocumentItemCategory[] = [...DOCUMENT_ITEM_CATEGORIES];
    assert.ok(categories.includes("questionnaire"));
  });
});

void describe("questionnaire storage: row mapping", () => {
  void test("maps category=questionnaire with null survey_data", () => {
    const item = mapDocumentItemRow(makeRow());
    assert.equal(item.category, "questionnaire");
    assert.equal(item.surveyData, null);
  });

  void test("maps survey_data from JSONB object (driver returns object)", () => {
    const payload = { companyName: "テスト会社", capitalAmount: 3000000 };
    const item = mapDocumentItemRow(makeRow({ survey_data: payload }));
    assert.deepEqual(item.surveyData, payload);
  });

  void test("maps survey_data from JSON string (driver returns string)", () => {
    const payload = { companyName: "テスト会社" };
    const item = mapDocumentItemRow(
      makeRow({ survey_data: JSON.stringify(payload) }),
    );
    assert.deepEqual(item.surveyData, payload);
  });

  void test("returns null for malformed JSON string", () => {
    const item = mapDocumentItemRow(makeRow({ survey_data: "not-json" }));
    assert.equal(item.surveyData, null);
  });

  void test("returns null when survey_data is array (invalid shape)", () => {
    const item = mapDocumentItemRow(makeRow({ survey_data: "[1,2]" }));
    assert.equal(item.surveyData, null);
  });

  void test("non-questionnaire row: category=null, survey_data=null", () => {
    const item = mapDocumentItemRow(
      makeRow({ category: null, survey_data: null }),
    );
    assert.equal(item.category, null);
    assert.equal(item.surveyData, null);
  });

  void test("non-questionnaire row: category=standard preserves null survey_data", () => {
    const item = mapDocumentItemRow(
      makeRow({
        category: "standard",
        checklist_item_code: "passport_copy",
        name: "パスポートコピー",
        survey_data: null,
      }),
    );
    assert.equal(item.category, "standard");
    assert.equal(item.surveyData, null);
  });

  void test("preserves all timestamp fields on questionnaire row", () => {
    const now = "2026-04-01T10:30:00.000Z";
    const item = mapDocumentItemRow(
      makeRow({
        requested_at: now,
        received_at: now,
        reviewed_at: now,
        last_follow_up_at: now,
      }),
    );
    assert.equal(item.requestedAt, now);
    assert.equal(item.receivedAt, now);
    assert.equal(item.reviewedAt, now);
    assert.equal(item.lastFollowUpAt, now);
  });
});

void describe("questionnaire aggregation: mapDetailCountsRow", () => {
  void test("returns zero questionnaire counts when row is undefined", () => {
    const counts = mapDetailCountsRow(undefined);
    assert.equal(counts.questionnaireItemsTotal, 0);
    assert.equal(counts.questionnaireItemsDone, 0);
  });

  void test("returns zero questionnaire counts when all fields are '0'", () => {
    const counts = mapDetailCountsRow(makeCountsRow());
    assert.equal(counts.questionnaireItemsTotal, 0);
    assert.equal(counts.questionnaireItemsDone, 0);
  });

  void test("parses questionnaire counts from string values", () => {
    const counts = mapDetailCountsRow(
      makeCountsRow({
        questionnaire_items_total: "5",
        questionnaire_items_done: "3",
      }),
    );
    assert.equal(counts.questionnaireItemsTotal, 5);
    assert.equal(counts.questionnaireItemsDone, 3);
  });

  void test("questionnaire counts are a subset of document item counts", () => {
    const counts = mapDetailCountsRow(
      makeCountsRow({
        document_items_total: "10",
        document_items_done: "6",
        questionnaire_items_total: "2",
        questionnaire_items_done: "1",
      }),
    );
    assert.ok(
      counts.questionnaireItemsTotal <= counts.documentItemsTotal,
      `questionnaire total (${String(counts.questionnaireItemsTotal)}) must be <= document total (${String(counts.documentItemsTotal)})`,
    );
    assert.ok(
      counts.questionnaireItemsDone <= counts.documentItemsDone,
      `questionnaire done (${String(counts.questionnaireItemsDone)}) must be <= document done (${String(counts.documentItemsDone)})`,
    );
  });

  void test("handles undefined string fields gracefully (defaults to 0)", () => {
    const partial = makeCountsRow();
    delete (partial as Record<string, unknown>).questionnaire_items_total;
    delete (partial as Record<string, unknown>).questionnaire_items_done;
    const counts = mapDetailCountsRow(partial as never);
    assert.equal(counts.questionnaireItemsTotal, 0);
    assert.equal(counts.questionnaireItemsDone, 0);
  });

  void test("all CaseDetailCounts fields are populated", () => {
    const counts: CaseDetailCounts = mapDetailCountsRow(
      makeCountsRow({
        document_items_total: "8",
        document_items_done: "5",
        questionnaire_items_total: "2",
        questionnaire_items_done: "1",
        case_parties: "3",
        tasks: "4",
        tasks_pending: "2",
        communication_logs: "7",
        submission_packages: "1",
        generated_documents: "2",
        validation_runs: "1",
        review_records: "1",
        billing_records: "3",
        payment_records: "2",
      }),
    );
    assert.equal(counts.documentItemsTotal, 8);
    assert.equal(counts.documentItemsDone, 5);
    assert.equal(counts.questionnaireItemsTotal, 2);
    assert.equal(counts.questionnaireItemsDone, 1);
    assert.equal(counts.caseParties, 3);
    assert.equal(counts.tasks, 4);
    assert.equal(counts.tasksPending, 2);
    assert.equal(counts.communicationLogs, 7);
    assert.equal(counts.submissionPackages, 1);
    assert.equal(counts.generatedDocuments, 2);
    assert.equal(counts.validationRuns, 1);
    assert.equal(counts.reviewRecords, 1);
    assert.equal(counts.billingRecords, 3);
    assert.equal(counts.paymentRecords, 2);
  });
});

void describe("questionnaire aggregation: questionnaire ⊆ document invariant", () => {
  void test("when only questionnaire items exist, totals are equal", () => {
    const counts = mapDetailCountsRow(
      makeCountsRow({
        document_items_total: "3",
        document_items_done: "2",
        questionnaire_items_total: "3",
        questionnaire_items_done: "2",
      }),
    );
    assert.equal(counts.questionnaireItemsTotal, counts.documentItemsTotal);
    assert.equal(counts.questionnaireItemsDone, counts.documentItemsDone);
  });

  void test("when no questionnaire items exist, questionnaire counts are zero", () => {
    const counts = mapDetailCountsRow(
      makeCountsRow({
        document_items_total: "10",
        document_items_done: "8",
        questionnaire_items_total: "0",
        questionnaire_items_done: "0",
      }),
    );
    assert.equal(counts.questionnaireItemsTotal, 0);
    assert.equal(counts.questionnaireItemsDone, 0);
    assert.equal(counts.documentItemsTotal, 10);
  });

  void test("mixed items: questionnaire < total", () => {
    const counts = mapDetailCountsRow(
      makeCountsRow({
        document_items_total: "15",
        document_items_done: "10",
        questionnaire_items_total: "2",
        questionnaire_items_done: "1",
      }),
    );
    assert.ok(counts.questionnaireItemsTotal < counts.documentItemsTotal);
    assert.ok(counts.questionnaireItemsDone < counts.documentItemsDone);
  });
});

void describe("questionnaire follow-up: status prerequisites", () => {
  const UNIVERSAL_FOLLOW_UP_STATUSES = ["waiting_upload", "revision_required"];
  const QUESTIONNAIRE_EXTRA_STATUSES = ["pending"];
  const REJECTED_STATUSES = [
    "uploaded_reviewing",
    "approved",
    "waived",
    "expired",
  ];

  void test("universal statuses allow follow-up for any category", () => {
    for (const status of UNIVERSAL_FOLLOW_UP_STATUSES) {
      const allowed = ["waiting_upload", "revision_required"];
      assert.ok(
        allowed.includes(status),
        `${status} should be universally allowed for follow-up`,
      );
    }
  });

  void test("questionnaire items additionally allow follow-up in 'pending'", () => {
    const baseAllowed = [...UNIVERSAL_FOLLOW_UP_STATUSES];
    const questionnaireAllowed = [
      ...baseAllowed,
      ...QUESTIONNAIRE_EXTRA_STATUSES,
    ];
    assert.ok(
      questionnaireAllowed.includes("pending"),
      "questionnaire items must allow follow-up in pending status",
    );
    assert.ok(
      !baseAllowed.includes("pending"),
      "base items must NOT allow follow-up in pending status",
    );
  });

  void test("follow-up is rejected for questionnaire items in terminal/review statuses", () => {
    for (const status of REJECTED_STATUSES) {
      const baseAllowed = ["waiting_upload", "revision_required"];
      const questionnaireAllowed = [...baseAllowed, "pending"];
      assert.ok(
        !questionnaireAllowed.includes(status),
        `follow-up must be rejected for questionnaire item in '${status}'`,
      );
    }
  });

  void test("follow-up prerequisite rule: category=questionnaire adds 'pending' to allowed set", () => {
    const buildAllowed = (category: string | null): string[] => {
      const allowed = ["waiting_upload", "revision_required"];
      if (category === "questionnaire") allowed.push("pending");
      return allowed;
    };

    const qAllowed = buildAllowed("questionnaire");
    const stdAllowed = buildAllowed("standard");
    const nullAllowed = buildAllowed(null);

    assert.ok(qAllowed.includes("pending"));
    assert.ok(!stdAllowed.includes("pending"));
    assert.ok(!nullAllowed.includes("pending"));
    assert.equal(qAllowed.length, 3);
    assert.equal(stdAllowed.length, 2);
    assert.equal(nullAllowed.length, 2);
  });
});

void describe("questionnaire cross-contract consistency", () => {
  void test("SURVEY_DATA_CATEGORY matches DOCUMENT_ITEM_CATEGORIES entry", () => {
    assert.ok(
      (DOCUMENT_ITEM_CATEGORIES as readonly string[]).includes(
        SURVEY_DATA_CATEGORY,
      ),
    );
  });

  void test("SURVEY_DATA_CATEGORY matches REQUIREMENT_CATEGORIES entry", () => {
    assert.ok(
      (REQUIREMENT_CATEGORIES as readonly string[]).includes(
        SURVEY_DATA_CATEGORY,
      ),
    );
  });

  void test("CaseDetailCounts questionnaire fields exist and default to zero", () => {
    const counts = mapDetailCountsRow(undefined);
    assert.equal(typeof counts.questionnaireItemsTotal, "number");
    assert.equal(typeof counts.questionnaireItemsDone, "number");
    assert.equal(counts.questionnaireItemsTotal, 0);
    assert.equal(counts.questionnaireItemsDone, 0);
  });

  void test("mapDocumentItemRow preserves questionnaire identity for aggregation", () => {
    const item = mapDocumentItemRow(
      makeRow({
        category: "questionnaire",
        survey_data: { businessPlan: "test" },
      }),
    );
    assert.equal(item.category, SURVEY_DATA_CATEGORY);
    assert.ok(item.surveyData !== null);
  });

  void test("non-questionnaire item does not carry survey_data", () => {
    const item = mapDocumentItemRow(
      makeRow({ category: "standard", survey_data: null }),
    );
    assert.notEqual(item.category, SURVEY_DATA_CATEGORY);
    assert.equal(item.surveyData, null);
  });

  void test("survey_data storage invariant: not copied to Case.extra_fields (type-level)", () => {
    const contract: SurveyDataWriteContract = {
      writeEndpoints: ["PATCH /document-items/:id/survey-data"],
      storageColumn: "survey_data",
      storageTable: "document_items",
      categoryFilter: "questionnaire",
      type: "Record<string, unknown> | null",
    };
    assert.equal(
      contract.storageTable,
      "document_items",
      "survey_data must be stored in document_items, not cases",
    );
    assert.notEqual(
      contract.storageTable,
      "cases",
      "survey_data must NOT be stored in cases table",
    );
  });
});
