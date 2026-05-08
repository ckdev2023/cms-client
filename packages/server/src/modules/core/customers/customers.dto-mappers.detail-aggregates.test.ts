import test from "node:test";
import assert from "node:assert/strict";

import type { Customer } from "../model/coreEntities";
import { mapCustomerToDetailDto } from "./customers.dto-mappers";
import type { CustomerDtoAggregates } from "./customers.types";

const baseCustomer: Customer = {
  id: "cust-agg-001",
  orgId: "org-001",
  type: "individual",
  baseProfile: {
    displayName: "山田太郎",
    customerNumber: "C-AGG-001",
  },
  contacts: [],
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

void test("mapCustomerToDetailDto passes through caseTypeCodes from aggregates", () => {
  const aggregates: CustomerDtoAggregates = {
    caseTypeCodes: ["dependent_visa", "engineer_humanities_intl_visa"],
    caseTitles: ["山田家族", "技人国案件"],
  };
  const dto = mapCustomerToDetailDto(baseCustomer, aggregates);
  assert.deepEqual(dto.caseTypeCodes, [
    "dependent_visa",
    "engineer_humanities_intl_visa",
  ]);
  assert.deepEqual(dto.caseTitles, ["山田家族", "技人国案件"]);
});

void test("mapCustomerToDetailDto defaults caseTypeCodes to empty array when aggregates omit it", () => {
  const dto = mapCustomerToDetailDto(baseCustomer, {});
  assert.deepEqual(dto.caseTypeCodes, []);
});

void test("mapCustomerToDetailDto defaults caseTypeCodes to empty array when no aggregates provided", () => {
  const dto = mapCustomerToDetailDto(baseCustomer);
  assert.deepEqual(dto.caseTypeCodes, []);
});

void test("mapCustomerToDetailDto normalizes caseTypeCodes (filters non-string items)", () => {
  const aggregates: CustomerDtoAggregates = {
    caseTypeCodes: ["dependent_visa", "" as string, "work"],
  };
  const dto = mapCustomerToDetailDto(baseCustomer, aggregates);
  assert.deepEqual(dto.caseTypeCodes, ["dependent_visa", "work"]);
});

void test("mapCustomerToDetailDto passes both caseTitles and caseTypeCodes with non-empty values", () => {
  const aggregates: CustomerDtoAggregates = {
    caseTitles: ["案件A", "案件B"],
    caseTypeCodes: ["dependent_visa", "engineer_humanities_intl_visa"],
  };
  const dto = mapCustomerToDetailDto(baseCustomer, aggregates);
  assert.equal(dto.caseTitles.length, 2);
  assert.equal(dto.caseTypeCodes.length, 2);
  assert.equal(dto.caseTitles[0], "案件A");
  assert.equal(dto.caseTypeCodes[0], "dependent_visa");
  assert.equal(dto.caseTitles[1], "案件B");
  assert.equal(dto.caseTypeCodes[1], "engineer_humanities_intl_visa");
});
