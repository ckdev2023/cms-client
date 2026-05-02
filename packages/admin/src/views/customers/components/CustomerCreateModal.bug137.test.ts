import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, setAppLocale, type AppLocale } from "../../../i18n";
import CustomerCreateModal from "./CustomerCreateModal.vue";
import type { CustomerCreateFormFields } from "../types";
import type { CustomerCreateFormErrorCode } from "../model/useCustomerCreateForm";

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

const ERROR_CODES: CustomerCreateFormErrorCode[] = [
  "unauthorized",
  "validationError",
  "requestFailed",
];

const LOCALES: AppLocale[] = ["zh-CN", "en-US", "ja-JP"];

function mountModal(overrides: {
  submitErrorCode?: CustomerCreateFormErrorCode | null;
  dedupeErrorCode?: CustomerCreateFormErrorCode | null;
  checkingDuplicates?: boolean;
}) {
  return mount(CustomerCreateModal, {
    props: {
      open: true,
      fields: { ...BLANK_FIELDS },
      canCreate: false,
      groupOptions: [{ value: "tokyo-1", label: "Tokyo 1" }],
      submitErrorCode: overrides.submitErrorCode ?? null,
      dedupeErrorCode: overrides.dedupeErrorCode ?? null,
      checkingDuplicates: overrides.checkingDuplicates ?? false,
    },
    global: { plugins: [i18n] },
    attachTo: document.body,
  });
}

function readStateMessages(): string[] {
  return Array.from(
    document.body.querySelectorAll<HTMLElement>(".customer-modal__state"),
  ).map((el) => (el.textContent ?? "").trim());
}

describe("CustomerCreateModal — BUG-137 createModal.state i18n", () => {
  afterEach(() => {
    setAppLocale(originalLocale);
    document.body.innerHTML = "";
  });

  for (const locale of LOCALES) {
    for (const code of ERROR_CODES) {
      it(`renders a localized message for submitErrorCode=${code} in ${locale}`, () => {
        setAppLocale(locale);
        mountModal({ submitErrorCode: code });
        const messages = readStateMessages();
        expect(messages.length).toBeGreaterThan(0);
        for (const message of messages) {
          expect(message).not.toBe("");
          expect(message).not.toContain(
            `customers.list.createModal.state.${code}`,
          );
        }
      });

      it(`renders a localized message for dedupeErrorCode=${code} in ${locale}`, () => {
        setAppLocale(locale);
        mountModal({ dedupeErrorCode: code });
        const messages = readStateMessages();
        expect(messages.length).toBeGreaterThan(0);
        for (const message of messages) {
          expect(message).not.toBe("");
          expect(message).not.toContain(
            `customers.list.createModal.state.${code}`,
          );
        }
      });
    }

    it(`renders a localized "checking duplicates" message in ${locale}`, () => {
      setAppLocale(locale);
      mountModal({ checkingDuplicates: true });
      const messages = readStateMessages();
      expect(messages.length).toBeGreaterThan(0);
      for (const message of messages) {
        expect(message).not.toBe("");
        expect(message).not.toContain(
          "customers.list.createModal.state.checkingDuplicates",
        );
      }
    });
  }
});
