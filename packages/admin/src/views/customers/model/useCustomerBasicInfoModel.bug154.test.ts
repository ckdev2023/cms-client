import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { CustomerDetail } from "../types";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import type { CustomerRepository } from "./CustomerRepository";
import { useCustomerBasicInfoModel } from "./useCustomerBasicInfoModel";

/**
 * BUG-154：客户详情 `客户负责人` dropdown 在已存在 owner 上 unselected。
 *
 * 与 BUG-146 同根：server 已会回填 `customer.owner.name = "Local Admin"`，但
 * 静态 owner catalog 不含该姓名，导致 `<option :value="opt.label">` 没有命中项，
 * 表单 select 即便快照值为 "Local Admin" 仍显示空。
 *
 * 修复要求：`useCustomerBasicInfoModel` 暴露的 `ownerOptions` 必须把客户已存在
 * 的 owner（即便不在 catalog 里）注入为合并选项，且 label 与 `currentSnapshot.owner`
 * 完全一致，从而让 dropdown 能正确命中。
 */

function createRepository(): Pick<
  CustomerRepository,
  "updateCustomerBasicInfo"
> {
  return {
    updateCustomerBasicInfo: vi.fn().mockResolvedValue({ id: "cust-bug-154" }),
  };
}

function makeCustomer(overrides: Partial<CustomerDetail> = {}): CustomerDetail {
  return {
    ...SAMPLE_CUSTOMER_DETAILS["cust-001"]!,
    id: "cust-bug-154",
    displayName: "R6试探客户",
    ...overrides,
  };
}

describe("useCustomerBasicInfoModel — BUG-154 owner dropdown reflects persisted non-catalog owner", () => {
  it("injects the persisted owner (Local Admin) into ownerOptions when not in catalog", () => {
    const customer = ref<CustomerDetail | null>(
      makeCustomer({ owner: { initials: "LA", name: "Local Admin" } }),
    );
    const locale = ref("zh-CN");
    const { ownerOptions } = useCustomerBasicInfoModel({
      customer: computed(() => customer.value),
      repository: createRepository(),
      locale,
    });

    const localAdmin = ownerOptions.value.find(
      (option) => option.label === "Local Admin",
    );
    expect(
      localAdmin,
      "ownerOptions must contain a Local Admin entry",
    ).toBeDefined();
    expect(localAdmin?.value).toBeTruthy();
  });

  it("currentSnapshot.owner matches the injected option label so the select stays selected", () => {
    const customer = ref<CustomerDetail | null>(
      makeCustomer({ owner: { initials: "LA", name: "Local Admin" } }),
    );
    const locale = ref("zh-CN");
    const { currentSnapshot, ownerOptions } = useCustomerBasicInfoModel({
      customer: computed(() => customer.value),
      repository: createRepository(),
      locale,
    });

    const snapshotOwner = currentSnapshot.value?.owner;
    expect(snapshotOwner).toBe("Local Admin");
    const matchByLabel = ownerOptions.value.find(
      (option) => option.label === snapshotOwner,
    );
    expect(
      matchByLabel,
      "select :value=label must hit one of the options",
    ).toBeDefined();
  });

  it("does not duplicate the option when persisted owner already matches a catalog entry", () => {
    const customer = ref<CustomerDetail | null>(
      makeCustomer({ owner: { initials: "TK", name: "高橋健太" } }),
    );
    const locale = ref("zh-CN");
    const { ownerOptions } = useCustomerBasicInfoModel({
      customer: computed(() => customer.value),
      repository: createRepository(),
      locale,
    });

    const labels = ownerOptions.value.map((option) => option.label);
    const matchCount = labels.filter((label) => label === "高桥健太").length;
    expect(matchCount).toBe(1);
    expect(labels).not.toContain("高橋健太");
  });

  it("renders the persisted owner label across en-US / ja-JP locales without dropping the option", () => {
    const customer = ref<CustomerDetail | null>(
      makeCustomer({ owner: { initials: "LA", name: "Local Admin" } }),
    );
    const locale = ref("en-US");
    const { ownerOptions, currentSnapshot } = useCustomerBasicInfoModel({
      customer: computed(() => customer.value),
      repository: createRepository(),
      locale,
    });

    expect(currentSnapshot.value?.owner).toBe("Local Admin");
    expect(
      ownerOptions.value.some((option) => option.label === "Local Admin"),
    ).toBe(true);

    locale.value = "ja-JP";
    expect(currentSnapshot.value?.owner).toBe("Local Admin");
    expect(
      ownerOptions.value.some((option) => option.label === "Local Admin"),
    ).toBe(true);
  });

  it("returns plain catalog options when customer has no owner name", () => {
    const customer = ref<CustomerDetail | null>(
      makeCustomer({ owner: { initials: "", name: "" } }),
    );
    const { ownerOptions } = useCustomerBasicInfoModel({
      customer: computed(() => customer.value),
      repository: createRepository(),
    });

    expect(ownerOptions.value.length).toBeGreaterThan(0);
    const blank = ownerOptions.value.find((option) => option.label === "");
    expect(blank).toBeUndefined();
  });
});
