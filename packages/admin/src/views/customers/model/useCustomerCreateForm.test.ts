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

// 既存スイートはデバウンスを 0ms にして watcher 即時発火を前提に検証する。
// デバウンス挙動本体（BUG-147 回帰）は useCustomerCreateForm.bug147.test.ts でカバー。
function buildForm(
  overrides: Partial<
    Pick<CustomerRepository, "checkDuplicates" | "createCustomer">
  > = {},
) {
  return useCustomerCreateForm({
    repository: createRepository(overrides),
    duplicateCheckDebounceMs: 0,
  });
}

describe("useCustomerCreateForm", () => {
  it("initializes with empty fields", () => {
    const { fields } = buildForm();
    expect(fields.legalName).toBe("");
    expect(fields.group).toBe("");
    expect(fields.phone).toBe("");
    expect(fields.email).toBe("");
    expect(fields.displayName).toBe("");
    expect(fields.nationality).toBe("");
    expect(fields.location).toBe("");
    expect(fields.sourceType).toBe("");
    expect(fields.visaType).toBe("");
    expect(fields.referrerName).toBe("");
  });

  it("canCreate is false when all fields are empty", () => {
    const { canCreate } = buildForm();
    expect(canCreate.value).toBe(false);
  });

  it("canCreate is true with legalName + group + phone", () => {
    const { fields, canCreate } = buildForm();
    fields.legalName = "Test";
    fields.group = "tokyo-1";
    fields.phone = "090-0000-0000";
    expect(canCreate.value).toBe(true);
  });

  it("requests duplicates when key fields change", async () => {
    const checkDuplicates = vi.fn().mockResolvedValue(DUPLICATES);
    const { fields, dedupeMatches, showDedupe } = buildForm({
      checkDuplicates,
    });

    fields.legalName = "田中太郎";
    fields.phone = "090-1234-5678";
    await nextTick();
    await flushPromises();

    expect(checkDuplicates).toHaveBeenLastCalledWith({
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
    const { fields, dedupeMatches } = buildForm({
      checkDuplicates: vi
        .fn<CustomerRepository["checkDuplicates"]>()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise),
    });

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
    const model = useCustomerCreateForm({
      repository,
      duplicateCheckDebounceMs: 0,
    });

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
    const model = buildForm({
      checkDuplicates: vi.fn().mockRejectedValue(
        new CustomerRepositoryError({
          code: "UNAUTHORIZED",
          message: "denied",
          status: 401,
        }),
      ),
    });

    model.fields.phone = "090-1234-5678";
    await nextTick();
    await flushPromises();

    expect(model.dedupeErrorCode.value).toBe("unauthorized");
    expect(model.dedupeMatches.value).toEqual([]);
  });

  it("round-trips location/sourceType/visaType/referrerName through createCustomer", async () => {
    const repository = createRepository();
    const model = useCustomerCreateForm({
      repository,
      duplicateCheckDebounceMs: 0,
    });

    model.fields.legalName = "田中太郎";
    model.fields.group = "東京一組";
    model.fields.phone = "090-1234-5678";
    model.fields.location = "JAPAN";
    model.fields.sourceType = "REFERRAL";
    model.fields.visaType = "business_manager";
    model.fields.referrerName = "佐藤様";

    const created = await model.createCustomer();

    expect(created).toEqual({ id: "cust-new" });
    expect(repository.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        location: "JAPAN",
        sourceType: "REFERRAL",
        visaType: "business_manager",
        referrerName: "佐藤様",
      }),
    );
  });

  it("round-trips empty optional fields without error", async () => {
    const repository = createRepository();
    const model = useCustomerCreateForm({
      repository,
      duplicateCheckDebounceMs: 0,
    });

    model.fields.legalName = "Test";
    model.fields.group = "tokyo-1";
    model.fields.phone = "090-0000-0000";

    const created = await model.createCustomer();

    expect(created).toEqual({ id: "cust-new" });
    expect(repository.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        location: "",
        sourceType: "",
        visaType: "",
        referrerName: "",
      }),
    );
  });

  it("resetForm clears fields and async state", async () => {
    const {
      fields,
      resetForm,
      createCustomer,
      dedupeMatches,
      submitErrorCode,
    } = buildForm({
      checkDuplicates: vi.fn().mockResolvedValue(DUPLICATES),
      createCustomer: vi.fn().mockRejectedValue(
        new CustomerRepositoryError({
          code: "VALIDATION_ERROR",
          message: "invalid",
          status: 422,
        }),
      ),
    });

    fields.legalName = "Test";
    fields.group = "tokyo-1";
    fields.phone = "090-0000";
    fields.email = "a@b.com";
    fields.nationality = "日本";
    fields.note = "memo";
    fields.location = "JAPAN";
    fields.sourceType = "WEB";
    fields.visaType = "student";
    fields.referrerName = "田中様";
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
    expect(fields.location).toBe("");
    expect(fields.sourceType).toBe("");
    expect(fields.visaType).toBe("");
    expect(fields.referrerName).toBe("");
    expect(dedupeMatches.value).toEqual([]);
    expect(submitErrorCode.value).toBeNull();
  });
});
