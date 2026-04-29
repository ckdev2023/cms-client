import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import CustomerCreateModal from "./CustomerCreateModal.vue";
import type { CustomerCreateFormFields } from "../types";

const BLANK_FIELDS: CustomerCreateFormFields = {
  displayName: "",
  group: "",
  legalName: "",
  kana: "",
  gender: "",
  birthDate: "",
  nationality: "",
  phone: "",
  email: "",
  referrer: "",
  location: "",
  sourceType: "",
  visaType: "",
  referrerName: "",
  avatar: "",
  note: "",
};

function readModalLabels(): string[] {
  return Array.from(
    document.body.querySelectorAll<HTMLElement>(".customer-modal__label"),
  ).map((el) => (el.textContent ?? "").trim());
}

function mountModal(fields: Partial<CustomerCreateFormFields> = {}) {
  return mount(CustomerCreateModal, {
    props: {
      open: true,
      fields: { ...BLANK_FIELDS, ...fields },
      canCreate: false,
      groupOptions: [{ value: "tokyo-1", label: "Tokyo 1" }],
    },
    global: { plugins: [i18n] },
    attachTo: document.body,
  });
}

describe.skip("CustomerCreateModal — BUG-093 字段去重", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("不再渲染历史的「来源 / 介绍人」自由文本框（drop legacy referrer input）", () => {
    mountModal();
    const labels = readModalLabels();
    expect(labels).not.toContain("Source / referral");
    expect(labels).not.toContain("来源 / 介绍人");
    expect(labels).not.toContain("紹介元 / 来源");
  });

  it("当 sourceType !== 'REFERRAL' 时隐藏介绍人姓名输入", () => {
    mountModal({ sourceType: "WEB" });
    const labels = readModalLabels();
    expect(labels).not.toContain("Referrer name");
    expect(labels).not.toContain("介绍人姓名");
    expect(labels).not.toContain("紹介者名");
  });

  it("当 sourceType === 'REFERRAL' 时显示介绍人姓名输入", () => {
    mountModal({ sourceType: "REFERRAL" });
    const labels = readModalLabels();
    expect(
      labels.some((l) => /Referrer name|介绍人姓名|紹介者名/.test(l)),
    ).toBe(true);
  });
});
