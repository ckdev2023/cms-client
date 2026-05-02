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

function readControl(id: string): HTMLElement | null {
  return document.body.querySelector<HTMLElement>(`#${id}`);
}

function readModalTitle(): string {
  return (
    document.body
      .querySelector<HTMLElement>(".customer-modal__title")
      ?.textContent?.trim() ?? ""
  );
}

describe("CustomerCreateModal — BUG-187 individual/corporation toggle", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
    document.body.innerHTML = "";
  });

  it("renders both individual and corporation radios with sync checked state", () => {
    mountModal({ customerType: "individual" });
    const individualRadio = readControl(
      "customer-create-customerType-individual",
    ) as HTMLInputElement | null;
    const corporationRadio = readControl(
      "customer-create-customerType-corporation",
    ) as HTMLInputElement | null;
    expect(individualRadio).not.toBeNull();
    expect(corporationRadio).not.toBeNull();
    expect(individualRadio?.checked).toBe(true);
    expect(corporationRadio?.checked).toBe(false);
  });

  it("hides individual-only fields when customerType is corporation", () => {
    mountModal({ customerType: "corporation" });
    expect(readControl("customer-create-gender")).toBeNull();
    expect(readControl("customer-create-birthDate")).toBeNull();
    expect(readControl("customer-create-nationality")).toBeNull();
    expect(readControl("customer-create-visaType")).toBeNull();
  });

  it("shows representative name field only for corporation", () => {
    mountModal({ customerType: "individual" });
    expect(readControl("customer-create-representativeName")).toBeNull();

    document.body.innerHTML = "";
    mountModal({ customerType: "corporation" });
    expect(readControl("customer-create-representativeName")).not.toBeNull();
  });

  it("renders type-specific title in en-US", () => {
    setAppLocale("en-US");
    mountModal({ customerType: "individual" });
    expect(readModalTitle()).toBe("Create individual customer");

    document.body.innerHTML = "";
    mountModal({ customerType: "corporation" });
    expect(readModalTitle()).toBe("Create corporate customer");
  });

  it("renders type-specific title in zh-CN", () => {
    setAppLocale("zh-CN");
    mountModal({ customerType: "individual" });
    expect(readModalTitle()).toBe("新建个人客户");

    document.body.innerHTML = "";
    mountModal({ customerType: "corporation" });
    expect(readModalTitle()).toBe("新建法人客户");
  });

  it("renders type-specific title in ja-JP", () => {
    setAppLocale("ja-JP");
    mountModal({ customerType: "individual" });
    expect(readModalTitle()).toBe("個人顧客を新規作成");

    document.body.innerHTML = "";
    mountModal({ customerType: "corporation" });
    expect(readModalTitle()).toBe("法人顧客を新規作成");
  });

  it("relabels legalName for corporation in en-US", () => {
    setAppLocale("en-US");
    mountModal({ customerType: "corporation" });
    const labels = Array.from(
      document.body.querySelectorAll<HTMLElement>(".customer-modal__label"),
    ).map((el) => el.textContent?.trim() ?? "");
    expect(labels.some((l) => /Company legal name/.test(l))).toBe(true);
    expect(labels.some((l) => /^Company kana$/.test(l))).toBe(true);
    expect(labels).not.toContain("Legal name *");
    expect(labels).not.toContain("Furigana");
  });
});
