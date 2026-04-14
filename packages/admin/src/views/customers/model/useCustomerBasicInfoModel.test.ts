import { describe, expect, it } from "vitest";
import { computed } from "vue";
import type { CustomerDetail } from "../types";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import {
  snapshotFromCustomer,
  useCustomerBasicInfoModel,
} from "./useCustomerBasicInfoModel";

function makeCustomerRef(id: string) {
  return computed<CustomerDetail | null>(
    () => SAMPLE_CUSTOMER_DETAILS[id] ?? null,
  );
}

describe("snapshotFromCustomer", () => {
  it("extracts editable fields from a CustomerDetail", () => {
    const customer = SAMPLE_CUSTOMER_DETAILS["cust-001"]!;
    const snap = snapshotFromCustomer(customer);
    expect(snap.displayName).toBe("田中太郎");
    expect(snap.legalName).toBe("田中太郎");
    expect(snap.furigana).toBe("タナカタロウ");
    expect(snap.nationality).toBe("日本");
    expect(snap.gender).toBe("男");
    expect(snap.birthDate).toBe("1985-06-15");
    expect(snap.phone).toBe("090-1234-5678");
    expect(snap.email).toBe("tanaka@example.com");
    expect(snap.group).toBe("東京一組");
    expect(snap.owner).toBe("山田翔太");
    expect(snap.referralSource).toBe("紹介（佐藤様）");
    expect(snap.avatar).toBe("");
    expect(snap.note).toBe("ビジネス拡大に伴う在留資格変更を検討中");
  });
});

describe("useCustomerBasicInfoModel", () => {
  it("defaults to non-editing mode", () => {
    const customer = makeCustomerRef("cust-001");
    const { isEditing, showSavedHint } = useCustomerBasicInfoModel(customer);
    expect(isEditing.value).toBe(false);
    expect(showSavedHint.value).toBe(false);
  });

  it("currentSnapshot reflects customer data", () => {
    const customer = makeCustomerRef("cust-002");
    const { currentSnapshot } = useCustomerBasicInfoModel(customer);
    expect(currentSnapshot.value).not.toBeNull();
    expect(currentSnapshot.value!.displayName).toBe("陈明");
    expect(currentSnapshot.value!.nationality).toBe("中国");
  });

  it("currentSnapshot returns null for null customer", () => {
    const customer = makeCustomerRef("nonexistent");
    const { currentSnapshot } = useCustomerBasicInfoModel(customer);
    expect(currentSnapshot.value).toBeNull();
  });

  it("startEditing enters edit mode and creates a form snapshot", () => {
    const customer = makeCustomerRef("cust-001");
    const { isEditing, formSnapshot, startEditing } =
      useCustomerBasicInfoModel(customer);

    startEditing();

    expect(isEditing.value).toBe(true);
    expect(formSnapshot.value).not.toBeNull();
    expect(formSnapshot.value!.displayName).toBe("田中太郎");
  });

  it("startEditing does nothing when customer is null", () => {
    const customer = makeCustomerRef("nonexistent");
    const { isEditing, formSnapshot, startEditing } =
      useCustomerBasicInfoModel(customer);

    startEditing();

    expect(isEditing.value).toBe(false);
    expect(formSnapshot.value).toBeNull();
  });

  it("cancelEditing exits edit mode and clears form snapshot", () => {
    const customer = makeCustomerRef("cust-001");
    const { isEditing, formSnapshot, startEditing, cancelEditing } =
      useCustomerBasicInfoModel(customer);

    startEditing();
    expect(isEditing.value).toBe(true);

    cancelEditing();
    expect(isEditing.value).toBe(false);
    expect(formSnapshot.value).toBeNull();
  });

  it("save exits edit mode and shows saved hint", () => {
    const customer = makeCustomerRef("cust-001");
    const { isEditing, showSavedHint, formSnapshot, startEditing, save } =
      useCustomerBasicInfoModel(customer);

    startEditing();
    save();

    expect(isEditing.value).toBe(false);
    expect(showSavedHint.value).toBe(true);
    expect(formSnapshot.value).toBeNull();
  });

  it("startEditing clears savedHint from previous save", () => {
    const customer = makeCustomerRef("cust-001");
    const { showSavedHint, startEditing, save } =
      useCustomerBasicInfoModel(customer);

    startEditing();
    save();
    expect(showSavedHint.value).toBe(true);

    startEditing();
    expect(showSavedHint.value).toBe(false);
  });

  it("formSnapshot is independently mutable from source data", () => {
    const customer = makeCustomerRef("cust-001");
    const { formSnapshot, currentSnapshot, startEditing } =
      useCustomerBasicInfoModel(customer);

    startEditing();
    formSnapshot.value!.displayName = "Modified Name";

    expect(formSnapshot.value!.displayName).toBe("Modified Name");
    expect(currentSnapshot.value!.displayName).toBe("田中太郎");
  });

  it("exposes groupOptions and ownerOptions", () => {
    const customer = makeCustomerRef("cust-001");
    const { groupOptions, ownerOptions } = useCustomerBasicInfoModel(customer);
    expect(groupOptions.value.length).toBeGreaterThan(0);
    expect(ownerOptions.value.length).toBeGreaterThan(0);
  });
});
