import test from "node:test";
import assert from "node:assert/strict";

import type { Customer } from "../model/coreEntities";
import {
  mapCustomerToSummaryDto,
  mapCustomerToDetailDto,
} from "./customers.dto-mappers";

function makeCustomer(baseProfile: Record<string, unknown>): Customer {
  return {
    id: "cust-ln-001",
    orgId: "org-001",
    type: "individual",
    baseProfile,
    contacts: [],
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  };
}

void test("mapCustomerToSummaryDto exposes localizedNames from baseProfile", () => {
  const customer = makeCustomer({
    name_cn: "张三",
    name_jp: "チョウサン",
    name_en: "Zhang San",
    name_default_locale: "zh",
    customerNumber: "C-001",
  });
  const dto = mapCustomerToSummaryDto(customer);
  assert.deepEqual(dto.localizedNames, {
    zh: "张三",
    ja: "チョウサン",
    en: "Zhang San",
    defaultLocale: "zh",
  });
});

void test("mapCustomerToSummaryDto returns nulls when names are absent", () => {
  const customer = makeCustomer({ customerNumber: "C-002", name_cn: "名前" });
  const dto = mapCustomerToSummaryDto(customer);
  assert.deepEqual(dto.localizedNames, {
    zh: "名前",
    ja: null,
    en: null,
    defaultLocale: null,
  });
});

void test("mapCustomerToDetailDto also includes localizedNames", () => {
  const customer = makeCustomer({
    name_cn: "李四",
    name_jp: "リシ",
    name_en: "Li Si",
    name_default_locale: "ja",
    customerNumber: "C-003",
  });
  const dto = mapCustomerToDetailDto(customer);
  assert.deepEqual(dto.localizedNames, {
    zh: "李四",
    ja: "リシ",
    en: "Li Si",
    defaultLocale: "ja",
  });
});

void test("localizedNames.defaultLocale is null for invalid stored locale", () => {
  const customer = makeCustomer({
    name_cn: "王五",
    name_default_locale: "fr",
    customerNumber: "C-004",
  });
  const dto = mapCustomerToSummaryDto(customer);
  assert.equal(dto.localizedNames.defaultLocale, null);
});
