import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { computed } from "vue";
import type { CustomerRelation } from "../types";
import type { CustomerRepository } from "./CustomerRepository";
import { useCustomerContactsModel } from "./useCustomerContactsModel";

function makeId(id: string) {
  return computed(() => id);
}

const RELATIONS: CustomerRelation[] = [
  {
    id: "REL-002-1",
    name: "佐藤花子",
    kana: "",
    relationType: "spouse",
    phone: "090-1111-2222",
    email: "hanako@example.com",
    tags: ["主联系人"],
    note: "",
  },
  {
    id: "REL-002-2",
    name: "佐藤事务所",
    kana: "",
    relationType: "agent",
    phone: "03-1111-2222",
    email: "sato-office@example.com",
    tags: ["代理人"],
    note: "",
  },
];

function createRepository(
  overrides: Partial<
    Pick<
      CustomerRepository,
      "createRelation" | "listRelations" | "updateRelation"
    >
  > = {},
): Pick<
  CustomerRepository,
  "createRelation" | "listRelations" | "updateRelation"
> {
  return {
    listRelations: vi.fn().mockResolvedValue(RELATIONS),
    createRelation: vi.fn().mockImplementation(async (input) => ({
      id: "REL-002-3",
      name: input.name,
      kana: "",
      relationType: input.relationType,
      phone: input.phone,
      email: input.email,
      tags: input.roleTitle ? [input.roleTitle] : [],
      note: "",
    })),
    updateRelation: vi.fn().mockImplementation(async (id, input) => ({
      id,
      name: input.name,
      kana: "",
      relationType: input.relationType,
      phone: input.phone,
      email: input.email,
      tags: input.roleTitle ? [input.roleTitle] : [],
      note: "",
    })),
    ...overrides,
  };
}

describe("useCustomerContactsModel", () => {
  it("loads all relations for a customer", async () => {
    const repository = createRepository();
    const { allRelations, filteredRelations, loading } =
      useCustomerContactsModel({
        customerId: makeId("cust-002"),
        repository,
      });

    expect(loading.value).toBe(true);
    await flushPromises();

    expect(repository.listRelations).toHaveBeenCalledWith("cust-002");
    expect(allRelations.value).toHaveLength(2);
    expect(filteredRelations.value).toHaveLength(2);
  });

  it("returns empty array for blank customer id", async () => {
    const repository = createRepository();
    const { allRelations } = useCustomerContactsModel({
      customerId: makeId("   "),
      repository,
    });

    await flushPromises();

    expect(allRelations.value).toHaveLength(0);
    expect(repository.listRelations).not.toHaveBeenCalled();
  });

  it("filters by search query after loading", async () => {
    const { filteredRelations, setSearch } = useCustomerContactsModel({
      customerId: makeId("cust-002"),
      repository: createRepository(),
    });

    await flushPromises();

    setSearch("花子");
    expect(filteredRelations.value.length).toBe(1);
    expect(filteredRelations.value[0].name).toContain("花子");
  });

  it("filters by search query using email and tag", async () => {
    const { filteredRelations, setSearch } = useCustomerContactsModel({
      customerId: makeId("cust-002"),
      repository: createRepository(),
    });

    await flushPromises();

    setSearch("sato-office");
    expect(filteredRelations.value.length).toBe(1);

    setSearch("代理人");
    expect(filteredRelations.value.length).toBe(1);
  });

  it("returns empty when search has no match", async () => {
    const { filteredRelations, setSearch } = useCustomerContactsModel({
      customerId: makeId("cust-002"),
      repository: createRepository(),
    });

    await flushPromises();

    setSearch("zzz-no-match");
    expect(filteredRelations.value).toHaveLength(0);
  });

  it("keeps selection logic after loading", async () => {
    const { selectedCount, isAllSelected, hasSelection } =
      useCustomerContactsModel({
        customerId: makeId("cust-002"),
        repository: createRepository(),
      });

    await flushPromises();

    expect(selectedCount.value).toBe(0);
    expect(isAllSelected.value).toBe(false);
    expect(hasSelection.value).toBe(false);
  });

  it("toggleSelect selects and deselects an item", async () => {
    const { selectedIds, selectedCount, toggleSelect } =
      useCustomerContactsModel({
        customerId: makeId("cust-002"),
        repository: createRepository(),
      });

    await flushPromises();

    toggleSelect("REL-002-1");
    expect(selectedIds.value["REL-002-1"]).toBe(true);
    expect(selectedCount.value).toBe(1);

    toggleSelect("REL-002-1");
    expect(selectedIds.value["REL-002-1"]).toBe(false);
    expect(selectedCount.value).toBe(0);
  });

  it("toggleSelectAll selects and deselects all filtered items", async () => {
    const { isAllSelected, isIndeterminate, selectedCount, toggleSelectAll } =
      useCustomerContactsModel({
        customerId: makeId("cust-002"),
        repository: createRepository(),
      });

    await flushPromises();

    toggleSelectAll();
    expect(isAllSelected.value).toBe(true);
    expect(isIndeterminate.value).toBe(false);
    expect(selectedCount.value).toBe(2);

    toggleSelectAll();
    expect(isAllSelected.value).toBe(false);
    expect(selectedCount.value).toBe(0);
  });

  it("isIndeterminate is true when partially selected", async () => {
    const { isIndeterminate, isAllSelected, toggleSelect } =
      useCustomerContactsModel({
        customerId: makeId("cust-002"),
        repository: createRepository(),
      });

    await flushPromises();

    toggleSelect("REL-002-1");
    expect(isIndeterminate.value).toBe(true);
    expect(isAllSelected.value).toBe(false);
  });

  it("creates relation and writes back current list", async () => {
    const repository = createRepository();
    const model = useCustomerContactsModel({
      customerId: makeId("cust-002"),
      repository,
    });

    await flushPromises();

    model.openCreateModal();
    model.updateFormField("name", "田中顾问");
    model.updateFormField("relationType", "agent");
    model.updateFormField("roleTitle", "顾问");
    model.updateFormField("phone", "03-2222-3333");
    model.updateFormField("email", "tanaka@example.com");
    await model.submitModal();

    expect(repository.createRelation).toHaveBeenCalledWith({
      customerId: "cust-002",
      name: "田中顾问",
      relationType: "agent",
      roleTitle: "顾问",
      phone: "03-2222-3333",
      email: "tanaka@example.com",
    });
    expect(model.allRelations.value[0]?.name).toBe("田中顾问");
    expect(model.isModalOpen.value).toBe(false);
  });

  it("updates relation and writes back current list", async () => {
    const repository = createRepository();
    const model = useCustomerContactsModel({
      customerId: makeId("cust-002"),
      repository,
    });

    await flushPromises();

    model.openEditModal(model.allRelations.value[0]);
    model.updateFormField("name", "佐藤花子（更新）");
    model.updateFormField("roleTitle", "紧急联系人");
    await model.submitModal();

    expect(repository.updateRelation).toHaveBeenCalledWith("REL-002-1", {
      customerId: "cust-002",
      name: "佐藤花子（更新）",
      relationType: "spouse",
      roleTitle: "紧急联系人",
      phone: "090-1111-2222",
      email: "hanako@example.com",
    });
    expect(model.allRelations.value[0]?.name).toBe("佐藤花子（更新）");
    expect(model.allRelations.value[0]?.tags).toEqual(["紧急联系人"]);
  });

  it("shows request failed state and retries loading", async () => {
    const repository = createRepository({
      listRelations: vi
        .fn<CustomerRepository["listRelations"]>()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce(RELATIONS),
    });
    const model = useCustomerContactsModel({
      customerId: makeId("cust-002"),
      repository,
    });

    await flushPromises();
    expect(model.errorCode.value).toBe("requestFailed");

    await model.retry();
    await flushPromises();

    expect(repository.listRelations).toHaveBeenCalledTimes(2);
    expect(model.errorCode.value).toBeNull();
    expect(model.allRelations.value).toHaveLength(2);
  });

  it("hasSelection reflects whether any item is selected", async () => {
    const {
      hasSelection,
      selectedRelationIds,
      selectedRelations,
      toggleSelect,
    } = useCustomerContactsModel({
      customerId: makeId("cust-002"),
      repository: createRepository(),
    });

    await flushPromises();

    expect(hasSelection.value).toBe(false);
    toggleSelect("REL-002-1");
    expect(hasSelection.value).toBe(true);
    expect(selectedRelationIds.value).toEqual(["REL-002-1"]);
    expect(selectedRelations.value.map((relation) => relation.name)).toEqual([
      "佐藤花子",
    ]);
  });
});
