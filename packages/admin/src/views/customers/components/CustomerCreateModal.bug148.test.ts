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

function queryControls(): HTMLElement[] {
  const root = document.body.querySelector(".customer-modal");
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>("input, select, textarea"),
  );
}

function queryLabels(): HTMLLabelElement[] {
  const root = document.body.querySelector(".customer-modal");
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLLabelElement>("label"));
}

describe("CustomerCreateModal — BUG-148 form field a11y", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("每个 <input>/<select> 都同时具备非空 id 与 name", () => {
    mountModal({ sourceType: "REFERRAL" });
    const controls = queryControls();
    expect(controls.length).toBeGreaterThanOrEqual(15);
    for (const el of controls) {
      const id = el.getAttribute("id") ?? "";
      const name = el.getAttribute("name") ?? "";
      expect(id, `${el.outerHTML.slice(0, 80)} 缺 id`).not.toBe("");
      expect(name, `${el.outerHTML.slice(0, 80)} 缺 name`).not.toBe("");
    }
  });

  it("modal 内 id 唯一，避免 label[for] 命中错位控件", () => {
    mountModal({ sourceType: "REFERRAL" });
    const ids = queryControls().map((el) => el.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("每个 <label> 都通过 for 关联到存在的表单控件", () => {
    mountModal({ sourceType: "REFERRAL" });
    const labels = queryLabels();
    expect(labels.length).toBeGreaterThanOrEqual(15);
    for (const label of labels) {
      const target = label.getAttribute("for") ?? "";
      expect(
        target,
        `${(label.textContent ?? "").trim()} label 缺 for`,
      ).not.toBe("");
      const control = document.getElementById(target);
      expect(control, `for="${target}" 未命中真实控件`).not.toBeNull();
      expect(["INPUT", "SELECT", "TEXTAREA"]).toContain(control?.tagName);
    }
  });

  it("非 REFERRAL 场景下隐藏 referrerName 字段，剩余字段仍全部具备 id/name/label[for]", () => {
    mountModal({ sourceType: "WEB" });
    const controls = queryControls();
    for (const el of controls) {
      expect(el.id).not.toBe("");
      expect(el.getAttribute("name")).not.toBe("");
    }
    expect(
      controls.some((el) => el.id === "customer-create-referrerName"),
    ).toBe(false);
    const labels = queryLabels();
    for (const label of labels) {
      const target = label.getAttribute("for") ?? "";
      expect(target).not.toBe("");
      expect(document.getElementById(target)).not.toBeNull();
    }
  });

  it("关闭按钮提供可访问名（aria-label 或文本），便于屏幕阅读器", () => {
    mountModal();
    const closeBtn = document.body.querySelector<HTMLButtonElement>(
      ".customer-modal__close",
    );
    expect(closeBtn).not.toBeNull();
    const ariaLabel = closeBtn?.getAttribute("aria-label") ?? "";
    const text = (closeBtn?.textContent ?? "").trim();
    expect(ariaLabel.length > 0 || text.length > 0).toBe(true);
  });
});
