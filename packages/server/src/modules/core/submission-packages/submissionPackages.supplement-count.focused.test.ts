import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  CASE_ID,
  GENERATED_DOC_ID,
  RELATED_PACKAGE_ID,
  REQUIREMENT_ID,
  VALIDATION_RUN_ID,
  createService,
  makeCtx,
  makeSubmissionPackageItemRow,
  makeSubmissionPackageRow,
  standardQueryFn,
} from "./submissionPackages.supplement-count.focused.test-support";

void describe("supplement_count increment on supplement submission", () => {
  void test("supplement submission increments supplement_count", async () => {
    const { svc, cases } = createService(
      standardQueryFn({
        submissionKind: "supplement",
        relatedSubmissionId: RELATED_PACKAGE_ID,
      }),
    );
    await svc.create(makeCtx(), {
      caseId: CASE_ID,
      submissionKind: "supplement",
      relatedSubmissionId: RELATED_PACKAGE_ID,
      authorityName: "Tokyo Immigration",
      submittedAt: "2026-04-01T10:00:00.000Z",
      items: [
        {
          itemType: "field_snapshot",
          refId: REQUIREMENT_ID,
          snapshotPayload: { stage: "S7" },
        },
      ],
    });
    assert.equal(
      cases.supplementIncrements.length,
      1,
      "incrementSupplementCount called once",
    );
    assert.equal(
      cases.supplementIncrements[0],
      CASE_ID,
      "incremented for the correct case",
    );
  });

  void test("initial submission does NOT increment supplement_count", async () => {
    const { svc, cases } = createService(standardQueryFn());
    await svc.create(makeCtx(), {
      caseId: CASE_ID,
      authorityName: "Tokyo Immigration",
      submittedAt: "2026-04-01T10:00:00.000Z",
      items: [
        {
          itemType: "field_snapshot",
          refId: REQUIREMENT_ID,
          snapshotPayload: { stage: "S7" },
        },
      ],
    });
    assert.equal(
      cases.supplementIncrements.length,
      0,
      "incrementSupplementCount not called for initial",
    );
  });

  void test("supplement submission in S6 both increments count and transitions to S7", async () => {
    const { svc, cases } = createService(
      standardQueryFn({
        submissionKind: "supplement",
        relatedSubmissionId: RELATED_PACKAGE_ID,
      }),
      "S6",
    );
    await svc.create(makeCtx(), {
      caseId: CASE_ID,
      submissionKind: "supplement",
      relatedSubmissionId: RELATED_PACKAGE_ID,
      authorityName: "Tokyo Immigration",
      submittedAt: "2026-04-01T10:00:00.000Z",
      items: [
        {
          itemType: "field_snapshot",
          refId: REQUIREMENT_ID,
          snapshotPayload: { stage: "S6" },
        },
      ],
    });
    assert.equal(cases.supplementIncrements.length, 1);
    assert.equal(cases.transitions.length, 1);
    assert.deepEqual(cases.transitions[0], {
      caseId: CASE_ID,
      input: { toStage: "S7" },
    });
  });
});

void describe("BMV submission payload — document_requirement snapshot", () => {
  void test("questionnaire document_requirement snapshot includes category and survey_data", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const { svc } = createService((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("from validation_runs"))
        return Promise.resolve({
          rows: [{ id: VALIDATION_RUN_ID, result_status: "passed" }],
          rowCount: 1,
        });
      if (sql.includes("select id from cases"))
        return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
      if (sql.includes("coalesce(max(submission_no), 0) + 1"))
        return Promise.resolve({
          rows: [{ next_submission_no: "1" }],
          rowCount: 1,
        });
      if (sql.includes("insert into submission_packages"))
        return Promise.resolve({
          rows: [makeSubmissionPackageRow()],
          rowCount: 1,
        });
      if (sql.includes("from document_items") && !sql.includes("insert")) {
        return Promise.resolve({
          rows: [
            {
              id: REQUIREMENT_ID,
              checklist_item_code: "bmv-questionnaire",
              name: "経営管理ビザ情報表",
              status: "approved",
              category: "questionnaire",
              survey_data: {
                companyName: "株式会社テスト",
                capitalAmount: 5000000,
              },
            },
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("insert into submission_package_items")) {
        const payloadParam = params?.[3];
        if (typeof payloadParam === "string") {
          const parsed = JSON.parse(payloadParam) as Record<string, unknown>;
          assert.equal(
            parsed.category,
            "questionnaire",
            "snapshot has category",
          );
          assert.ok(parsed.surveyData, "snapshot has surveyData");
          assert.equal(
            (parsed.surveyData as Record<string, unknown>).companyName,
            "株式会社テスト",
          );
        }
        return Promise.resolve({
          rows: [makeSubmissionPackageItemRow()],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    await svc.create(makeCtx(), {
      caseId: CASE_ID,
      authorityName: "Tokyo Immigration",
      submittedAt: "2026-04-01T10:00:00.000Z",
      items: [{ itemType: "document_requirement", refId: REQUIREMENT_ID }],
    });
    const snapshotInsert = calls.find(
      (c) =>
        c.sql.includes("insert into submission_package_items") &&
        typeof c.params?.[3] === "string",
    );
    assert.ok(snapshotInsert, "snapshot inserted");
    const snapshotJson = snapshotInsert.params?.[3];
    assert.ok(typeof snapshotJson === "string");
    const snapshotPayload = JSON.parse(snapshotJson) as Record<string, unknown>;
    assert.equal(snapshotPayload.category, "questionnaire");
    assert.deepEqual(snapshotPayload.surveyData, {
      companyName: "株式会社テスト",
      capitalAmount: 5000000,
    });
  });

  void test("standard document_requirement snapshot omits category and survey_data when null", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const { svc } = createService((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("from validation_runs"))
        return Promise.resolve({
          rows: [{ id: VALIDATION_RUN_ID, result_status: "passed" }],
          rowCount: 1,
        });
      if (sql.includes("select id from cases"))
        return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
      if (sql.includes("coalesce(max(submission_no), 0) + 1"))
        return Promise.resolve({
          rows: [{ next_submission_no: "1" }],
          rowCount: 1,
        });
      if (sql.includes("insert into submission_packages"))
        return Promise.resolve({
          rows: [makeSubmissionPackageRow()],
          rowCount: 1,
        });
      if (sql.includes("from document_items") && !sql.includes("insert"))
        return Promise.resolve({
          rows: [
            {
              id: REQUIREMENT_ID,
              checklist_item_code: "passport",
              name: "Passport Copy",
              status: "approved",
              category: null,
              survey_data: null,
            },
          ],
          rowCount: 1,
        });
      if (sql.includes("insert into submission_package_items"))
        return Promise.resolve({
          rows: [makeSubmissionPackageItemRow()],
          rowCount: 1,
        });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    await svc.create(makeCtx(), {
      caseId: CASE_ID,
      authorityName: "Tokyo Immigration",
      submittedAt: "2026-04-01T10:00:00.000Z",
      items: [{ itemType: "document_requirement", refId: REQUIREMENT_ID }],
    });
    const snapshotInsert = calls.find(
      (c) =>
        c.sql.includes("insert into submission_package_items") &&
        typeof c.params?.[3] === "string",
    );
    assert.ok(snapshotInsert);
    const snapshotJson = snapshotInsert.params?.[3];
    assert.ok(typeof snapshotJson === "string");
    const snapshotPayload = JSON.parse(snapshotJson) as Record<string, unknown>;
    assert.equal(
      snapshotPayload.category,
      undefined,
      "no category for standard",
    );
    assert.equal(
      snapshotPayload.surveyData,
      undefined,
      "no surveyData for standard",
    );
    assert.equal(snapshotPayload.checklistItemCode, "passport");
  });

  void test("BMV generated_document_version snapshot captures title, status, format", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const { svc } = createService((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("from validation_runs"))
        return Promise.resolve({
          rows: [{ id: VALIDATION_RUN_ID, result_status: "passed" }],
          rowCount: 1,
        });
      if (sql.includes("select id from cases"))
        return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
      if (sql.includes("coalesce(max(submission_no), 0) + 1"))
        return Promise.resolve({
          rows: [{ next_submission_no: "1" }],
          rowCount: 1,
        });
      if (sql.includes("insert into submission_packages"))
        return Promise.resolve({
          rows: [makeSubmissionPackageRow()],
          rowCount: 1,
        });
      if (sql.includes("from generated_documents")) {
        return Promise.resolve({
          rows: [
            {
              id: GENERATED_DOC_ID,
              title: "在留資格認定証明書交付申請書",
              version_no: 2,
              output_format: "pdf",
              status: "final",
              file_url: "https://ext.example.com/docs/coe-application.pdf",
            },
          ],
          rowCount: 1,
        });
      }
      if (sql.includes("insert into submission_package_items"))
        return Promise.resolve({
          rows: [
            makeSubmissionPackageItemRow({
              item_type: "generated_document_version",
              ref_id: GENERATED_DOC_ID,
            }),
          ],
          rowCount: 1,
        });
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    const created = await svc.create(makeCtx(), {
      caseId: CASE_ID,
      authorityName: "Tokyo Immigration",
      submittedAt: "2026-04-01T10:00:00.000Z",
      items: [
        { itemType: "generated_document_version", refId: GENERATED_DOC_ID },
      ],
    });
    assert.equal(created.items.length, 1);
    const snapshotInsert = calls.find(
      (c) =>
        c.sql.includes("insert into submission_package_items") &&
        typeof c.params?.[3] === "string",
    );
    assert.ok(snapshotInsert);
    const snapshotJson = snapshotInsert.params?.[3];
    assert.ok(typeof snapshotJson === "string");
    const payload = JSON.parse(snapshotJson) as Record<string, unknown>;
    assert.equal(payload.title, "在留資格認定証明書交付申請書");
    assert.equal(payload.versionNo, 2);
    assert.equal(payload.outputFormat, "pdf");
    assert.equal(payload.status, "final");
  });
});
