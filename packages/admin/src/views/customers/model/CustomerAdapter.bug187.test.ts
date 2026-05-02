import { describe, expect, it } from "vitest";
import type { CustomerCreateFormFields } from "../types";
import { buildCreateCustomerPayload } from "./CustomerAdapter";

const CORPORATION_FIELDS: CustomerCreateFormFields = {
  customerType: "corporation",
  displayName: "Acme Display",
  group: "tokyo-1",
  legalName: "株式会社アクメ",
  kana: "アクメ",
  // 个人专属字段（应被忽略）
  gender: "male",
  birthDate: "1991-03-14",
  nationality: "日本",
  phone: "03-1111-2222",
  email: "biz@acme.example",
  referrer: "客户推荐",
  location: "JAPAN",
  sourceType: "REFERRAL",
  visaType: "business_manager",
  referrerName: "田中先生",
  representativeName: "山田 太郎",
  avatar: "logo.png",
  note: "重点跟进",
};

describe("CustomerAdapter — BUG-187 corporation create payload", () => {
  it("emits type=corporation when customerType is corporation", () => {
    const payload = buildCreateCustomerPayload(CORPORATION_FIELDS);
    expect(payload.type).toBe("corporation");
  });

  it("uses companyKana / representativeName instead of furigana for corporation", () => {
    const payload = buildCreateCustomerPayload(CORPORATION_FIELDS);
    expect(payload.baseProfile).toMatchObject({
      displayName: "Acme Display",
      legalName: "株式会社アクメ",
      companyKana: "アクメ",
      representativeName: "山田 太郎",
    });
    expect(payload.baseProfile).not.toHaveProperty("furigana");
  });

  it("omits individual-only schema fields for corporation", () => {
    const payload = buildCreateCustomerPayload(CORPORATION_FIELDS);
    expect(payload.baseProfile).not.toHaveProperty("gender");
    expect(payload.baseProfile).not.toHaveProperty("birthday");
    expect(payload.baseProfile).not.toHaveProperty("nationality");
    expect(payload.baseProfile).not.toHaveProperty("visaType");
    expect(payload.baseProfile).not.toHaveProperty("name_cn");
  });

  it("keeps generic contact + grouping fields on corporation payload", () => {
    const payload = buildCreateCustomerPayload(CORPORATION_FIELDS);
    expect(payload.baseProfile).toMatchObject({
      group: "tokyo-1",
      phone: "03-1111-2222",
      email: "biz@acme.example",
      referralSource: "客户推荐",
      location: "JAPAN",
      sourceType: "REFERRAL",
      referrerName: "田中先生",
      avatar: "logo.png",
      note: "重点跟进",
    });
  });

  it("strips empty optional location/sourceType/referrerName for corporation", () => {
    const payload = buildCreateCustomerPayload({
      ...CORPORATION_FIELDS,
      location: "",
      sourceType: "",
      referrerName: "",
    });
    expect(payload.baseProfile.location).toBeUndefined();
    expect(payload.baseProfile.sourceType).toBeUndefined();
    expect(payload.baseProfile.referrerName).toBeUndefined();
  });

  it("still emits type=individual when customerType defaults to individual", () => {
    const payload = buildCreateCustomerPayload({
      ...CORPORATION_FIELDS,
      customerType: "individual",
      legalName: "Wang Wei",
    });
    expect(payload.type).toBe("individual");
    expect(payload.baseProfile).toHaveProperty("name_cn", "Wang Wei");
  });
});
