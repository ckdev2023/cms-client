import { describe, expect, it } from "vitest";
import type { CustomerCreateFormFields } from "../types";
import {
  buildCreateCustomerPayload,
  buildUpdateCustomerPayload,
} from "./CustomerAdapter";

const CREATE_FIELDS: CustomerCreateFormFields = {
  displayName: "张伟（就劳）",
  group: "tokyo-1",
  legalName: "张伟",
  kana: "チョウ イ",
  gender: "男",
  birthDate: "1991-03-14",
  nationality: "中国",
  phone: "090-1234-5678",
  email: "zhang@example.com",
  referrer: "客户推荐",
  location: "JAPAN",
  sourceType: "REFERRAL",
  visaType: "engineer_specialist",
  referrerName: "田中先生",
  avatar: "avatar.png",
  note: "prefer wechat",
};

// BUG-137：表单不填生年月日时，payload 应省略 birthday 字段，避免 server 把空字符串当作非法日期。
describe("CustomerAdapter — BUG-137 birthday omission when blank", () => {
  it("omits birthday from create payload when birthDate is empty", () => {
    const payload = buildCreateCustomerPayload({
      ...CREATE_FIELDS,
      birthDate: "",
    });
    expect(payload.baseProfile).not.toHaveProperty("birthday");
  });

  it("omits birthday from create payload when birthDate is whitespace-only", () => {
    const payload = buildCreateCustomerPayload({
      ...CREATE_FIELDS,
      birthDate: "   ",
    });
    expect(payload.baseProfile).not.toHaveProperty("birthday");
  });

  it("omits birthday from update payload when birthDate is empty", () => {
    const payload = buildUpdateCustomerPayload({
      displayName: "张伟（更新）",
      legalName: "张伟",
      furigana: "チョウ イ",
      nationality: "中国",
      gender: "男",
      birthDate: "",
      phone: "090-1234-5678",
      email: "zhang@example.com",
      group: "tokyo-2",
      ownerId: "owner-2",
      referralSource: "客户推荐",
      location: "OVERSEAS",
      sourceType: "WEB",
      visaType: "student",
      referrerName: "佐藤様",
      avatar: "avatar.png",
      note: "updated",
    });
    expect(payload.baseProfile).not.toHaveProperty("birthday");
  });
});
