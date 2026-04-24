import test from "node:test";
import assert from "node:assert/strict";

import type { ContactPerson, Customer } from "../model/coreEntities";
import {
  createDefaultCustomerBmvProfile,
  mapContactPersonToCustomerRelationDto,
  mapCustomerToDetailDto,
  mapCustomerToSummaryDto,
  normalizeCustomerBmvProfile,
  resolveCustomerBmvIntakeStatus,
} from "./customers.dto-mappers";

const customer: Customer = {
  id: "cust-001",
  orgId: "org-001",
  type: "individual",
  baseProfile: {
    displayName: "佐藤美咲",
    legalName: "佐藤美咲",
    furigana: "サトウミサキ",
    customerNumber: "C-20240004",
    nationality: "日本",
    gender: "女",
    birthDate: "1995-07-22",
    note: "経営管理ビザの新規取得を検討中",
    owner: { name: "高橋健太", initials: "TK" },
    groupName: "東京一組",
    referralSource: "広告（経営管理）",
    bmvProfile: {
      questionnaireStatus: "returned",
      quoteStatus: "confirmed",
      signStatus: "pending",
      questionnaireSentAt: "2026-04-01T09:00:00+09:00",
      quoteConfirmedAt: "2026-04-09T18:00:00+09:00",
    },
  },
  contacts: [{ phone: "070-8888-1208", email: "misaki.sato@example.jp" }],
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-09T00:00:00.000Z",
};

void test("mapCustomerToSummaryDto maps stable admin-facing fields", () => {
  const summary = mapCustomerToSummaryDto(customer, {
    totalCases: 0,
    activeCases: 0,
    lastContactDate: "2026-04-09",
    lastContactChannel: "メール",
  });

  assert.equal(summary.displayName, "佐藤美咲");
  assert.equal(summary.phone, "070-8888-1208");
  assert.equal(summary.owner.initials, "TK");
  assert.equal(summary.group, "東京一組");
  assert.equal(summary.bmvProfile?.intakeStatus, "sign_pending");
});

void test("mapCustomerToDetailDto includes detail-only aggregates", () => {
  const detail = mapCustomerToDetailDto(customer, {
    totalCases: 2,
    activeCases: 1,
    archivedCases: 1,
    caseNames: ["経営管理 新規取得", "会社設立"],
    lastCaseCreatedDate: "2026-04-10",
  });

  assert.equal(detail.nationality, "日本");
  assert.equal(detail.archivedCases, 1);
  assert.deepEqual(detail.caseNames, ["経営管理 新規取得", "会社設立"]);
  assert.equal(detail.lastCaseCreatedDate, "2026-04-10");
});

void test("mapContactPersonToCustomerRelationDto adapts contact_persons as P0 relation tab source", () => {
  const relationSource: ContactPerson = {
    id: "cp-001",
    orgId: "org-001",
    companyId: null,
    customerId: "cust-001",
    name: "田中花子",
    roleTitle: "緊急連絡先",
    relationType: "spouse",
    phone: "090-0000-1111",
    email: "hanako@example.jp",
    preferredLanguage: "ja",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  };

  assert.deepEqual(mapContactPersonToCustomerRelationDto(relationSource), {
    id: "cp-001",
    name: "田中花子",
    kana: "",
    relationType: "spouse",
    phone: "090-0000-1111",
    email: "hanako@example.jp",
    tags: ["緊急連絡先"],
    note: "",
  });
});

void test("normalizeCustomerBmvProfile defaults invalid values and resolves intake order", () => {
  const profile = normalizeCustomerBmvProfile({
    questionnaireStatus: "returned",
    quoteStatus: "generated",
    signStatus: "unexpected",
  });

  assert.ok(profile);
  assert.equal(profile.quoteStatus, "generated");
  assert.equal(profile.signStatus, "not_started");
  assert.equal(profile.intakeStatus, "sign_pending");
  assert.equal(
    resolveCustomerBmvIntakeStatus({
      questionnaireStatus: "returned",
      quoteStatus: "generated",
      signStatus: "pending",
    }),
    "sign_pending",
  );
  assert.equal(
    resolveCustomerBmvIntakeStatus({
      questionnaireStatus: "returned",
      quoteStatus: "confirmed",
      signStatus: "signed",
    }),
    "ready_for_case_creation",
  );
});

void test("mapCustomerToDetailDto merges camel and snake bmvProfile fields", () => {
  const detail = mapCustomerToDetailDto(
    {
      ...customer,
      baseProfile: {
        ...customer.baseProfile,
        bmvProfile: {
          quoteStatus: "generated",
        },
        bmv_profile: {
          questionnaire_status: "returned",
          sign_status: "pending",
          memo: "legacy note",
        },
      },
    },
    {},
  );

  assert.deepEqual(detail.bmvProfile, {
    ...createDefaultCustomerBmvProfile(),
    questionnaireStatus: "returned",
    quoteStatus: "generated",
    signStatus: "pending",
    intakeStatus: "sign_pending",
    note: "legacy note",
  });
});
