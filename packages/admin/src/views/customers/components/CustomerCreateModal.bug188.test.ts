import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import CustomerCreateModal from "./CustomerCreateModal.vue";
import type { CustomerCreateFormFields } from "../types";

const BLANK_FIELDS: CustomerCreateFormFields = {
  customerType: "individual",
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
  representativeName: "",
  avatar: "",
  note: "",
};

const originalLocale = i18n.global.locale.value as AppLocale;

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

function readBirthDateInput(): HTMLInputElement | null {
  return document.body.querySelector<HTMLInputElement>(
    "#customer-create-birthDate",
  );
}

describe("CustomerCreateModal — BUG-188 birthDate picker locale", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
    document.body.innerHTML = "";
  });

  it("passes current locale to the native date input lang attribute (en-US)", () => {
    setAppLocale("en-US");
    mountModal({ customerType: "individual" });
    const input = readBirthDateInput();
    expect(input).not.toBeNull();
    expect(input?.getAttribute("type")).toBe("date");
    expect(input?.getAttribute("lang")).toBe("en-US");
  });

  it("passes current locale to the native date input lang attribute (ja-JP)", () => {
    setAppLocale("ja-JP");
    mountModal({ customerType: "individual" });
    expect(readBirthDateInput()?.getAttribute("lang")).toBe("ja-JP");
  });

  it("passes current locale to the native date input lang attribute (zh-CN)", () => {
    setAppLocale("zh-CN");
    mountModal({ customerType: "individual" });
    expect(readBirthDateInput()?.getAttribute("lang")).toBe("zh-CN");
  });

  it("does not render the birthDate picker for corporation customers", () => {
    setAppLocale("en-US");
    mountModal({ customerType: "corporation" });
    expect(readBirthDateInput()).toBeNull();
  });
});
