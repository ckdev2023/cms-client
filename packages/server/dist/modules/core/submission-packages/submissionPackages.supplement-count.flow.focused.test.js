import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mapSubmissionPackageRow } from "./submissionPackages.service";
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
void describe("supplement submission end-to-end flow", () => {
  void test("supplement with mixed items: document_requirement + generated_document_version + field_snapshot", async () => {
    const { svc, cases, timeline } = createService((sql, params) => {
      if (sql.includes("from validation_runs"))
        return Promise.resolve({
          rows: [{ id: VALIDATION_RUN_ID, result_status: "passed" }],
          rowCount: 1,
        });
      if (sql.includes("select id from cases"))
        return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
      if (
        sql.includes("from submission_packages") &&
        sql.includes("where id = $1")
      )
        return Promise.resolve({
          rows: [{ id: RELATED_PACKAGE_ID }],
          rowCount: 1,
        });
      if (sql.includes("coalesce(max(submission_no), 0) + 1"))
        return Promise.resolve({
          rows: [{ next_submission_no: "3" }],
          rowCount: 1,
        });
      if (sql.includes("insert into submission_packages"))
        return Promise.resolve({
          rows: [
            makeSubmissionPackageRow({
              submission_no: 3,
              submission_kind: "supplement",
              related_submission_id: RELATED_PACKAGE_ID,
              validation_run_id: params?.[5] ?? null,
            }),
          ],
          rowCount: 1,
        });
      if (sql.includes("from document_items") && !sql.includes("insert"))
        return Promise.resolve({
          rows: [
            {
              id: REQUIREMENT_ID,
              checklist_item_code: "bmv-questionnaire",
              name: "経営管理ビザ情報表",
              status: "approved",
              category: "questionnaire",
              survey_data: { companyName: "Test Corp" },
            },
          ],
          rowCount: 1,
        });
      if (sql.includes("from generated_documents"))
        return Promise.resolve({
          rows: [
            {
              id: GENERATED_DOC_ID,
              title: "申請理由書",
              version_no: 2,
              output_format: "pdf",
              status: "final",
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
    }, "S7");
    const created = await svc.create(makeCtx(), {
      caseId: CASE_ID,
      submissionKind: "supplement",
      relatedSubmissionId: RELATED_PACKAGE_ID,
      authorityName: "Osaka Immigration",
      submittedAt: "2026-04-15T10:00:00.000Z",
      items: [
        { itemType: "document_requirement", refId: REQUIREMENT_ID },
        { itemType: "generated_document_version", refId: GENERATED_DOC_ID },
        {
          itemType: "field_snapshot",
          refId: "case-field-1",
          snapshotPayload: { supplementCount: 2, visaPlan: "new_5year" },
        },
      ],
    });
    assert.equal(created.submissionKind, "supplement");
    assert.equal(created.submissionNo, 3);
    assert.equal(created.relatedSubmissionId, RELATED_PACKAGE_ID);
    assert.equal(created.validationRunId, VALIDATION_RUN_ID);
    assert.equal(cases.supplementIncrements.length, 1);
    assert.equal(cases.supplementIncrements[0], CASE_ID);
    assert.equal(
      cases.transitions.length,
      0,
      "S7 case should not re-transition",
    );
    assert.equal(timeline.writes.length, 1);
    const tlEntry = timeline.writes[0];
    assert.equal(tlEntry.action, "submission_package.created");
    const payload = tlEntry.payload;
    assert.equal(payload.submissionKind, "supplement");
    assert.equal(payload.itemCount, 3);
  });
  void test("supplement submission requires relatedSubmissionId", async () => {
    const { svc } = createService(
      standardQueryFn({ submissionKind: "supplement" }),
    );
    await assert.rejects(
      () =>
        svc.create(makeCtx(), {
          caseId: CASE_ID,
          submissionKind: "supplement",
          authorityName: "Tokyo Immigration",
          submittedAt: "2026-04-01T10:00:00.000Z",
          items: [
            {
              itemType: "field_snapshot",
              refId: REQUIREMENT_ID,
              snapshotPayload: { stage: "S7" },
            },
          ],
        }),
      /relatedSubmissionId is required/,
    );
  });
  void test("initial submission rejects relatedSubmissionId", async () => {
    const { svc } = createService(standardQueryFn());
    await assert.rejects(
      () =>
        svc.create(makeCtx(), {
          caseId: CASE_ID,
          submissionKind: "initial",
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
        }),
      /initial package cannot set relatedSubmissionId/,
    );
  });
});
void describe("submission package row mapping", () => {
  void test("maps submission_kind correctly for supplement", () => {
    const row = makeSubmissionPackageRow({
      submission_kind: "supplement",
      related_submission_id: RELATED_PACKAGE_ID,
      submission_no: 3,
    });
    const pkg = mapSubmissionPackageRow(row);
    assert.equal(pkg.submissionKind, "supplement");
    assert.equal(pkg.relatedSubmissionId, RELATED_PACKAGE_ID);
    assert.equal(pkg.submissionNo, 3);
  });
  void test("maps initial package with null relatedSubmissionId", () => {
    const pkg = mapSubmissionPackageRow(makeSubmissionPackageRow());
    assert.equal(pkg.submissionKind, "initial");
    assert.equal(pkg.relatedSubmissionId, null);
  });
});
//# sourceMappingURL=submissionPackages.supplement-count.flow.focused.test.js.map
