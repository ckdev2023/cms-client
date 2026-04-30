import { flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerRepository } from "./CustomerRepository";
import { useCustomerCreateForm } from "./useCustomerCreateForm";

/**
 * BUG-147 回帰：`CustomerCreateModal` の查重 watcher は debounce が無く、
 * 一度の表單填寫で `POST /api/customers/check-duplicates` が 28 連発していた。
 *
 * 现在 watcher は 250ms debounce が掛かっているため、debounce 窓内で行われる
 * 連続キーストロークは最後の 1 回しか fetch を発火しない。
 */
describe("useCustomerCreateForm BUG-147 dedupe watcher debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function createRepository(): Pick<
    CustomerRepository,
    "checkDuplicates" | "createCustomer"
  > {
    return {
      checkDuplicates: vi.fn().mockResolvedValue([]),
      createCustomer: vi.fn().mockResolvedValue({ id: "cust-new" }),
    };
  }

  it("collapses 28 keystrokes within the debounce window into a single fetch", async () => {
    const repository = createRepository();
    const { fields } = useCustomerCreateForm({ repository });

    const legalNameKeystrokes = "田中太郎".split("");
    const phoneKeystrokes = "090-1234-5678".split("");
    const emailKeystrokes = "tanaka@example.com".split("");
    const totalKeystrokes =
      legalNameKeystrokes.length +
      phoneKeystrokes.length +
      emailKeystrokes.length;
    expect(totalKeystrokes).toBeGreaterThanOrEqual(28);

    let typedLegal = "";
    for (const ch of legalNameKeystrokes) {
      typedLegal += ch;
      fields.legalName = typedLegal;
      await nextTick();
    }
    let typedPhone = "";
    for (const ch of phoneKeystrokes) {
      typedPhone += ch;
      fields.phone = typedPhone;
      await nextTick();
    }
    let typedEmail = "";
    for (const ch of emailKeystrokes) {
      typedEmail += ch;
      fields.email = typedEmail;
      await nextTick();
    }

    expect(repository.checkDuplicates).not.toHaveBeenCalled();

    vi.advanceTimersByTime(249);
    await nextTick();
    expect(repository.checkDuplicates).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await nextTick();
    await flushPromises();

    expect(repository.checkDuplicates).toHaveBeenCalledTimes(1);
    expect(repository.checkDuplicates).toHaveBeenLastCalledWith({
      name: "田中太郎",
      phone: "090-1234-5678",
      email: "tanaka@example.com",
    });
  });

  it("dropdown-only fields (gender/location/...) do not trigger any fetch", async () => {
    const repository = createRepository();
    const { fields } = useCustomerCreateForm({ repository });

    fields.gender = "F";
    fields.nationality = "日本";
    fields.location = "JAPAN";
    fields.sourceType = "REFERRAL";
    fields.visaType = "business_manager";
    fields.note = "memo";
    await nextTick();
    vi.advanceTimersByTime(1000);
    await flushPromises();

    expect(repository.checkDuplicates).not.toHaveBeenCalled();
  });

  it("fires once per pause: two pauses → two fetches", async () => {
    const repository = createRepository();
    const { fields } = useCustomerCreateForm({ repository });

    fields.legalName = "田";
    await nextTick();
    fields.legalName = "田中";
    await nextTick();
    vi.advanceTimersByTime(250);
    await flushPromises();
    expect(repository.checkDuplicates).toHaveBeenCalledTimes(1);

    fields.phone = "0";
    await nextTick();
    fields.phone = "09";
    await nextTick();
    fields.phone = "090";
    await nextTick();
    vi.advanceTimersByTime(250);
    await flushPromises();
    expect(repository.checkDuplicates).toHaveBeenCalledTimes(2);
  });

  it("resetForm cancels pending debounced fetch", async () => {
    const repository = createRepository();
    const { fields, resetForm } = useCustomerCreateForm({ repository });

    fields.legalName = "田中太郎";
    fields.phone = "090-1234-5678";
    await nextTick();

    resetForm();

    vi.advanceTimersByTime(1000);
    await flushPromises();

    expect(repository.checkDuplicates).not.toHaveBeenCalled();
  });
});
