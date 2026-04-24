import { flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { CustomerDuplicateCandidate } from "./CustomerAdapter";
import type { CustomerRepository } from "./CustomerRepository";
import { CustomerRepositoryError } from "./CustomerRepository";
import { useCustomerCreateForm } from "./useCustomerCreateForm";

const DUPLICATES: CustomerDuplicateCandidate[] = [
  {
    id: "1",
    displayName: "田中太郎",
    legalName: "田中太郎",
    furigana: "タナカタロウ",
    phone: "090-1234-5678",
    email: "tanaka@example.com",
    group: "東京一組",
    matchedFields: ["phone", "email"],
  },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createRepository(
  overrides: Partial<
    Pick<CustomerRepository, "checkDuplicates" | "createCustomer">
  > = {},
): Pick<CustomerRepository, "checkDuplicates" | "createCustomer"> {
  return {
    checkDuplicates: vi.fn().mockResolvedValue([]),
    createCustomer: vi.fn().mockResolvedValue({ id: "cust-new" }),
    ...overrides,
  };
}

describe("useCustomerCreateForm", () => {
  it("initializes with empty fields", () => {
    const { fields } = useCustomerCreateForm({
      repository: createRepository(),
    });
    expect(fields.legalName).toBe("");
    expect(fields.group).toBe("");
    expect(fields.phone).toBe("");
    expect(fields.email).toBe("");
    expect(fields.displayName).toBe("");
    expect(fields.nationality).toBe("");
  });

  it("canCreate is false when all fields are empty", () => {
    const { canCreate } = useCustomerCreateForm({
      repository: createRepository(),
    });
    expect(canCreate.value).toBe(false);
  });

  it("canCreate is true with legalName + group + phone", () => {
    const { fields, canCreate } = useCustomerCreateForm({
      repository: createRepository(),
    });
    fields.legalName = "Test";
    fields.group = "tokyo-1";
    fields.phone = "090-0000-0000";
    expect(canCreate.value).toBe(true);
  });

  it("requests duplicates when key fields change", async () => {
    const repository = createRepository({
      checkDuplicates: vi.fn().mockResolvedValue(DUPLICATES),
    });
    const { fields, dedupeMatches, showDedupe } = useCustomerCreateForm({
      repository,
    });

    fields.legalName = "田中太郎";
    fields.phone = "090-1234-5678";
    await nextTick();
    await flushPromises();

    expect(repository.checkDuplicates).toHaveBeenLastCalledWith({
      name: "田中太郎",
      phone: "090-1234-5678",
      email: "",
    });
    expect(dedupeMatches.value).toEqual(DUPLICATES);
    expect(showDedupe.value).toBe(true);
  });

  it("keeps only the latest duplicate result", async () => {
    const first = deferred<CustomerDuplicateCandidate[]>();
    const second = deferred<CustomerDuplicateCandidate[]>();
    const repository = createRepository({
      checkDuplicates: vi
        .fn<CustomerRepository["checkDuplicates"]>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise),
    });
    const { fields, dedupeMatches } = useCustomerCreateForm({ repository });

    fields.phone = "090-1111-1111";
    await nextTick();
    fields.email = "tanaka@example.com";
    await nextTick();

    second.resolve(DUPLICATES);
    await flushPromises();

    first.resolve([]);
    await flushPromises();

    expect(dedupeMatches.value).toEqual(DUPLICATES);
  });

  it("createCustomer submits current fields", async () => {
    const repository = createRepository();
    const model = useCustomerCreateForm({ repository });

    model.fields.legalName = "田中太郎";
    model.fields.group = "東京一組";
    model.fields.phone = "090-1234-5678";
    model.fields.email = "tanaka@example.com";

    const created = await model.createCustomer();

    expect(created).toEqual({ id: "cust-new" });
    expect(repository.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        legalName: "田中太郎",
        group: "東京一組",
        phone: "090-1234-5678",
        email: "tanaka@example.com",
      }),
    );
  });

  it("maps duplicate check errors", async () => {
    const repository = createRepository({
      checkDuplicates: vi.fn().mockRejectedValue(
        new CustomerRepositoryError({
          code: "UNAUTHORIZED",
          message: "denied",
          status: 401,
        }),
      ),
    });
    const model = useCustomerCreateForm({ repository });

    model.fields.phone = "090-1234-5678";
    await nextTick();
    await flushPromises();

    expect(model.dedupeErrorCode.value).toBe("unauthorized");
    expect(model.dedupeMatches.value).toEqual([]);
  });

  it("resetForm clears fields and async state", async () => {
    const repository = createRepository({
      checkDuplicates: vi.fn().mockResolvedValue(DUPLICATES),
      createCustomer: vi.fn().mockRejectedValue(
        new CustomerRepositoryError({
          code: "VALIDATION_ERROR",
          message: "invalid",
          status: 422,
        }),
      ),
    });
    const {
      fields,
      resetForm,
      createCustomer,
      dedupeMatches,
      submitErrorCode,
    } = useCustomerCreateForm({ repository });

    fields.legalName = "Test";
    fields.group = "tokyo-1";
    fields.phone = "090-0000";
    fields.email = "a@b.com";
    fields.nationality = "日本";
    fields.note = "memo";
    await nextTick();
    await flushPromises();
    await createCustomer();

    resetForm();

    expect(fields.legalName).toBe("");
    expect(fields.group).toBe("");
    expect(fields.phone).toBe("");
    expect(fields.email).toBe("");
    expect(fields.nationality).toBe("");
    expect(fields.note).toBe("");
    expect(dedupeMatches.value).toEqual([]);
    expect(submitErrorCode.value).toBeNull();
  });
});
