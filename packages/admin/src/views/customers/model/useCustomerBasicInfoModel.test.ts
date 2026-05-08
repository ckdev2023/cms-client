import { computed, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CustomerDetail } from "../types";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import type { CustomerRepository } from "./CustomerRepository";
import { CustomerRepositoryError } from "./CustomerRepository";
import {
  snapshotFromCustomer,
  useCustomerBasicInfoModel,
} from "./useCustomerBasicInfoModel";
import {
  clearUserAliases,
  registerUserAliases,
} from "../../../shared/model/useOrgUserOptions";
import {
  clearGroupAliases,
  registerGroupAliases,
} from "../../../shared/model/useGroupOptions";

function createRepository(
  overrides: Partial<Pick<CustomerRepository, "updateCustomerBasicInfo">> = {},
): Pick<CustomerRepository, "updateCustomerBasicInfo"> {
  return {
    updateCustomerBasicInfo: vi.fn().mockResolvedValue({ id: "cust-001" }),
    ...overrides,
  };
}

function makeCustomerRef(id: string) {
  const customer = ref<CustomerDetail | null>(
    SAMPLE_CUSTOMER_DETAILS[id] ?? null,
  );
  return {
    source: customer,
    computed: computed<CustomerDetail | null>(() => customer.value),
  };
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
    const { isEditing, showSavedHint } = useCustomerBasicInfoModel({
      customer: customer.computed,
      repository: createRepository(),
    });

    expect(isEditing.value).toBe(false);
    expect(showSavedHint.value).toBe(false);
  });

  it("currentSnapshot reflects customer data", () => {
    const customer = makeCustomerRef("cust-002");
    const { currentSnapshot } = useCustomerBasicInfoModel({
      customer: customer.computed,
      repository: createRepository(),
    });

    expect(currentSnapshot.value).not.toBeNull();
    expect(currentSnapshot.value!.displayName).toBe("陈明");
    expect(currentSnapshot.value!.nationality).toBe("中国");
  });

  it("currentSnapshot localizes owner and group labels when locale is zh-CN", () => {
    const customer = makeCustomerRef("cust-003");
    const locale = ref("zh-CN");
    const { currentSnapshot } = useCustomerBasicInfoModel({
      customer: customer.computed,
      repository: createRepository(),
      locale,
    });

    expect(currentSnapshot.value!.group).toBe("大阪组（已停用）");
    expect(currentSnapshot.value!.owner).toBe("高桥健太");
  });

  it("startEditing enters edit mode and creates a form snapshot", () => {
    const customer = makeCustomerRef("cust-001");
    const { isEditing, formSnapshot, startEditing } = useCustomerBasicInfoModel(
      {
        customer: customer.computed,
        repository: createRepository(),
      },
    );

    startEditing();

    expect(isEditing.value).toBe(true);
    expect(formSnapshot.value).not.toBeNull();
    expect(formSnapshot.value!.displayName).toBe("田中太郎");
  });

  it("save submits payload and updates current snapshot", async () => {
    const customer = makeCustomerRef("cust-001");
    const repository = createRepository();
    const refreshCustomer = vi.fn().mockResolvedValue(undefined);
    const model = useCustomerBasicInfoModel({
      customer: customer.computed,
      repository,
      refreshCustomer,
    });

    model.startEditing();
    model.formSnapshot.value!.displayName = "田中次郎";
    model.formSnapshot.value!.owner = "高橋健太";

    const saved = await model.save();

    expect(saved).toBe(true);
    expect(repository.updateCustomerBasicInfo).toHaveBeenCalledWith(
      "cust-001",
      expect.objectContaining({
        displayName: "田中次郎",
        group: "tokyo-1",
        ownerId: "takahashi-k",
      }),
    );
    expect(refreshCustomer).toHaveBeenCalledTimes(1);
    expect(model.currentSnapshot.value!.displayName).toBe("田中次郎");
    expect(model.showSavedHint.value).toBe(true);
    expect(model.isEditing.value).toBe(false);
  });

  it("cancelEditing exits edit mode and clears form snapshot", () => {
    const customer = makeCustomerRef("cust-001");
    const { isEditing, formSnapshot, startEditing, cancelEditing } =
      useCustomerBasicInfoModel({
        customer: customer.computed,
        repository: createRepository(),
      });

    startEditing();
    expect(isEditing.value).toBe(true);

    cancelEditing();
    expect(isEditing.value).toBe(false);
    expect(formSnapshot.value).toBeNull();
  });

  it("keeps editing state and exposes validation error when save fails", async () => {
    const customer = makeCustomerRef("cust-001");
    const model = useCustomerBasicInfoModel({
      customer: customer.computed,
      repository: createRepository({
        updateCustomerBasicInfo: vi.fn().mockRejectedValue(
          new CustomerRepositoryError({
            code: "VALIDATION_ERROR",
            message: "invalid",
            status: 422,
          }),
        ),
      }),
    });

    model.startEditing();
    const saved = await model.save();

    expect(saved).toBe(false);
    expect(model.isEditing.value).toBe(true);
    expect(model.errorCode.value).toBe("validationError");
    expect(model.formSnapshot.value).not.toBeNull();
  });

  it("formSnapshot is independently mutable from source data", () => {
    const customer = makeCustomerRef("cust-001");
    const { formSnapshot, currentSnapshot, startEditing } =
      useCustomerBasicInfoModel({
        customer: customer.computed,
        repository: createRepository(),
      });

    startEditing();
    formSnapshot.value!.displayName = "Modified Name";

    expect(formSnapshot.value!.displayName).toBe("Modified Name");
    expect(currentSnapshot.value!.displayName).toBe("田中太郎");
  });

  it("exposes disabled group option when current customer belongs to disabled group", () => {
    const customer = makeCustomerRef("cust-003");
    const { groupOptions, ownerOptions } = useCustomerBasicInfoModel({
      customer: customer.computed,
      repository: createRepository(),
    });

    expect(groupOptions.value.length).toBeGreaterThan(0);
    expect(
      groupOptions.value.some((option) => option.label.includes("已停用")),
    ).toBe(true);
    expect(ownerOptions.value.length).toBeGreaterThan(0);
  });

  describe("groupOptions (catalog + alias merge)", () => {
    const ALIAS_UUID = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";

    afterEach(() => {
      clearGroupAliases();
    });

    it("mergesCatalogAndAliasGroupOptions", () => {
      registerGroupAliases([{ id: ALIAS_UUID, name: "tokyo-1" }]);

      const customer = makeCustomerRef("cust-001");
      const locale = ref("zh-CN");
      const { groupOptions } = useCustomerBasicInfoModel({
        customer: customer.computed,
        repository: createRepository(),
        locale,
      });

      const values = groupOptions.value.map((o) => o.value);
      expect(values).toContain("tokyo-1");
      expect(values).toContain("tokyo-2");
      expect(values).toContain(ALIAS_UUID);
      expect(new Set(values).size).toBe(values.length);
    });

    it("selectsAliasUuidWhenSnapshotIsRawSlug", () => {
      registerGroupAliases([{ id: ALIAS_UUID, name: "tokyo-1" }]);

      const customerRef = ref<CustomerDetail | null>({
        ...SAMPLE_CUSTOMER_DETAILS["cust-001"]!,
        group: ALIAS_UUID,
      });
      const customer = computed<CustomerDetail | null>(() => customerRef.value);
      const locale = ref("zh-CN");
      const { currentSnapshot, groupOptions } = useCustomerBasicInfoModel({
        customer,
        repository: createRepository(),
        locale,
      });

      expect(currentSnapshot.value!.group).toBe("东京一组");

      const values = groupOptions.value.map((o) => o.value);
      expect(values).toContain(ALIAS_UUID);
    });
  });

  describe("ownerOptions (active users)", () => {
    afterEach(() => {
      clearUserAliases();
    });

    it("ownerOptionsMatchActiveUsers", () => {
      registerUserAliases([
        { id: "u-001", displayName: "Local Admin" },
        { id: "u-002", displayName: "テスト太郎" },
      ]);

      const customer = makeCustomerRef("cust-001");
      const { ownerOptions } = useCustomerBasicInfoModel({
        customer: customer.computed,
        repository: createRepository(),
      });

      const labels = ownerOptions.value.map((o) => o.label);
      expect(labels).toContain("Local Admin");
      expect(labels).toContain("テスト太郎");
    });

    it("injects persisted owner when not in active user list", () => {
      registerUserAliases([{ id: "u-001", displayName: "Local Admin" }]);

      const customer = makeCustomerRef("cust-001");
      const { ownerOptions } = useCustomerBasicInfoModel({
        customer: customer.computed,
        repository: createRepository(),
      });

      const labels = ownerOptions.value.map((o) => o.label);
      expect(labels).toContain("山田翔太");
      expect(labels).toContain("Local Admin");
    });
  });
});
