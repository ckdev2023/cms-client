import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useCustomerDetailModel } from "./useCustomerDetailModel";

describe("useCustomerDetailModel", () => {
  it("returns customer data for a known ID", () => {
    const id = ref("cust-001");
    const { customer, notFound } = useCustomerDetailModel(id);
    expect(customer.value).not.toBeNull();
    expect(customer.value!.displayName).toBe("田中太郎");
    expect(notFound.value).toBe(false);
  });

  it("returns null and notFound for an unknown ID", () => {
    const id = ref("nonexistent");
    const { customer, notFound } = useCustomerDetailModel(id);
    expect(customer.value).toBeNull();
    expect(notFound.value).toBe(true);
  });

  it("reacts to ID changes", () => {
    const id = ref("cust-001");
    const { customer } = useCustomerDetailModel(id);
    expect(customer.value!.id).toBe("cust-001");

    id.value = "cust-002";
    expect(customer.value!.id).toBe("cust-002");
    expect(customer.value!.displayName).toBe("陈明");
  });

  it("defaults activeTab to basic", () => {
    const id = ref("cust-001");
    const { activeTab } = useCustomerDetailModel(id);
    expect(activeTab.value).toBe("basic");
  });

  it("switchTab updates activeTab", () => {
    const id = ref("cust-001");
    const { activeTab, switchTab } = useCustomerDetailModel(id);
    switchTab("cases");
    expect(activeTab.value).toBe("cases");
    switchTab("log");
    expect(activeTab.value).toBe("log");
  });

  it("avatarInitials returns first char of displayName", () => {
    const id = ref("cust-001");
    const { avatarInitials } = useCustomerDetailModel(id);
    expect(avatarInitials.value).toBe("田");
  });

  it("avatarInitials returns ? for unknown customer", () => {
    const id = ref("unknown");
    const { avatarInitials } = useCustomerDetailModel(id);
    expect(avatarInitials.value).toBe("?");
  });
});
