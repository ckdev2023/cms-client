import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { i18n, setAppLocale } from "../../../i18n";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";
import type { CustomerRepository } from "../model/CustomerRepository";
import CustomerBasicInfoTab from "./CustomerBasicInfoTab.vue";

describe("CustomerBasicInfoTab", () => {
  beforeEach(() => {
    setAppLocale("en-US");
  });

  const customer = SAMPLE_CUSTOMER_DETAILS["cust-001"]!;
  const bmvCustomer = SAMPLE_CUSTOMER_DETAILS["cust-004"]!;

  function createRepository(
    overrides: Partial<
      Pick<
        CustomerRepository,
        | "updateCustomerBasicInfo"
        | "sendBmvQuestionnaire"
        | "generateBmvQuote"
        | "recordBmvSign"
      >
    > = {},
  ): Pick<
    CustomerRepository,
    | "updateCustomerBasicInfo"
    | "sendBmvQuestionnaire"
    | "generateBmvQuote"
    | "recordBmvSign"
  > {
    return {
      updateCustomerBasicInfo: vi.fn().mockResolvedValue({ id: customer.id }),
      sendBmvQuestionnaire: vi
        .fn()
        .mockResolvedValue({ id: customer.id, bmvProfile: null }),
      generateBmvQuote: vi
        .fn()
        .mockResolvedValue({ id: customer.id, bmvProfile: null }),
      recordBmvSign: vi
        .fn()
        .mockResolvedValue({ id: customer.id, bmvProfile: null }),
      ...overrides,
    };
  }

  function factory(nextCustomer = customer) {
    const repository = createRepository();
    const refreshCustomer = vi.fn().mockResolvedValue(undefined);
    const wrapper = mount(CustomerBasicInfoTab, {
      props: { customer: nextCustomer, repository, refreshCustomer },
      global: { plugins: [i18n] },
    });

    return { wrapper, repository, refreshCustomer };
  }

  it("renders the basic info title", () => {
    const { wrapper: w } = factory();
    expect(w.find(".basic-info__title").text()).toBe("Basic info");
  });

  it("renders edit button in read mode", () => {
    const { wrapper: w } = factory();
    const btns = w.findAll("button");
    const editBtn = btns.find((b) => b.text() === "Edit");
    expect(editBtn).toBeTruthy();
  });

  it("shows form fields with customer data", () => {
    const { wrapper: w } = factory();
    const displayNameInput = w.find("#basicInfoDisplayName")
      .element as HTMLInputElement;
    expect(displayNameInput.value).toBe("田中太郎");
  });

  it("form fields are disabled in read mode", () => {
    const { wrapper: w } = factory();
    const input = w.find("#basicInfoDisplayName").element as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("clicking edit enables form fields", async () => {
    const { wrapper: w } = factory();
    const editBtn = w.findAll("button").find((b) => b.text() === "Edit")!;
    await editBtn.trigger("click");
    await nextTick();
    const input = w.find("#basicInfoDisplayName").element as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });

  it("shows cancel and save buttons in edit mode", async () => {
    const { wrapper: w } = factory();
    const editBtn = w.findAll("button").find((b) => b.text() === "Edit")!;
    await editBtn.trigger("click");
    await nextTick();

    const btns = w.findAll("button").map((b) => b.text());
    expect(btns).toContain("Cancel");
    expect(btns).toContain("Save");
  });

  it("cancel returns to read mode", async () => {
    const { wrapper: w } = factory();
    const editBtn = w.findAll("button").find((b) => b.text() === "Edit")!;
    await editBtn.trigger("click");
    await nextTick();

    const cancelBtn = w.findAll("button").find((b) => b.text() === "Cancel")!;
    await cancelBtn.trigger("click");
    await nextTick();

    const input = w.find("#basicInfoDisplayName").element as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("save returns to read mode and shows saved hint", async () => {
    const { wrapper: w, repository, refreshCustomer } = factory();
    const editBtn = w.findAll("button").find((b) => b.text() === "Edit")!;
    await editBtn.trigger("click");
    await nextTick();

    const saveBtn = w.findAll("button").find((b) => b.text() === "Save")!;
    await saveBtn.trigger("click");
    await flushPromises();

    const input = w.find("#basicInfoDisplayName").element as HTMLInputElement;
    expect(repository.updateCustomerBasicInfo).toHaveBeenCalledWith(
      customer.id,
      expect.objectContaining({ displayName: customer.displayName }),
    );
    expect(refreshCustomer).toHaveBeenCalledTimes(1);
    expect(input.disabled).toBe(true);
    expect(w.find(".basic-info__saved-hint").exists()).toBe(true);
    expect(w.find(".basic-info__saved-hint").text()).toBe("Saved");
  });

  it("renders all 17 form fields", () => {
    const { wrapper: w } = factory();
    const fields = w.findAll(".basic-info__field");
    expect(fields).toHaveLength(17);
  });

  it("gender select has three options", () => {
    const { wrapper: w } = factory();
    const gender = w.find("#basicInfoGender");
    const options = gender.findAll("option");
    expect(options).toHaveLength(3);
  });

  it("referral source field spans full width", () => {
    const { wrapper: w } = factory();
    const referralField = w
      .findAll(".basic-info__field")
      .find((f) => f.classes("basic-info__field--full"));
    expect(referralField).toBeTruthy();
    expect(referralField!.find("#basicInfoReferralSource").exists()).toBe(true);
  });

  it("renders nationality from customer data", () => {
    const { wrapper: w } = factory();
    const input = w.find("#basicInfoNationality").element as HTMLInputElement;
    expect(input.value).toBe("日本");
  });

  it("renders gender from customer data", () => {
    const { wrapper: w } = factory();
    const select = w.find("#basicInfoGender").element as HTMLSelectElement;
    expect(select.value).toBe("男");
  });

  it("renders birth date from customer data", () => {
    const { wrapper: w } = factory();
    const input = w.find("#basicInfoBirthDate").element as HTMLInputElement;
    expect(input.value).toBe("1985-06-15");
  });

  it("renders birth date as text in read mode to avoid duplicate native spinbutton labels", () => {
    const { wrapper: w } = factory();
    const input = w.find("#basicInfoBirthDate");
    expect(input.attributes("type")).toBe("text");
    expect(input.attributes("aria-label")).toBe("Date of birth");
  });

  it("switches birth date back to native date input in edit mode", async () => {
    const { wrapper: w } = factory();
    const editBtn = w.findAll("button").find((b) => b.text() === "Edit")!;
    await editBtn.trigger("click");
    await nextTick();

    expect(w.find("#basicInfoBirthDate").attributes("type")).toBe("date");
  });

  it("renders a localized avatar chooser instead of relying on native file input text", () => {
    const { wrapper: w } = factory();

    expect(w.find("#basicInfoAvatar").attributes("type")).toBe("file");
    expect(w.find(".basic-info__file-trigger").text()).toBe("Choose image");
    expect(w.find(".basic-info__file-status").text()).toBe("No file selected");
  });

  it("updates avatar status text when a file is selected", async () => {
    const { wrapper: w } = factory();
    const editBtn = w.findAll("button").find((b) => b.text() === "Edit")!;
    await editBtn.trigger("click");
    await nextTick();

    const input = w.find("#basicInfoAvatar");
    const file = new File(["avatar"], "profile.png", { type: "image/png" });

    Object.defineProperty(input.element, "files", {
      configurable: true,
      value: [file],
    });

    await input.trigger("change");

    expect(w.find(".basic-info__file-status").text()).toBe("profile.png");
  });

  it("localizes avatar chooser copy in ja-JP", () => {
    setAppLocale("ja-JP");
    const { wrapper: w } = factory();

    expect(w.find(".basic-info__file-trigger").text()).toBe("画像を選択");
    expect(w.find(".basic-info__file-status").text()).toBe(
      "ファイルが選択されていません",
    );
  });

  it("localizes furigana label and group value in zh-CN", () => {
    setAppLocale("zh-CN");
    const { wrapper: w } = factory();

    expect(w.find("label[for='basicInfoFurigana']").text()).toBe(
      "假名（片假名）",
    );
    expect((w.find("#basicInfoGroup").element as HTMLSelectElement).value).toBe(
      "东京一组",
    );
  });

  it("renders the BMV intake card when bmvEnabled is true for BMV customers", () => {
    const repository = createRepository();
    const wrapper = mount(CustomerBasicInfoTab, {
      props: {
        customer: bmvCustomer,
        repository,
        bmvEnabled: true,
      },
      global: { plugins: [i18n] },
    });
    expect(wrapper.find(".bmv-intake-card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Sign pending");
  });

  it("does not render the BMV intake card for non-BMV customers even when bmvEnabled is true", () => {
    const repository = createRepository();
    const wrapper = mount(CustomerBasicInfoTab, {
      props: {
        customer,
        repository,
        bmvEnabled: true,
      },
      global: { plugins: [i18n] },
    });
    expect(wrapper.find(".bmv-intake-card").exists()).toBe(false);
  });

  it("hides BMV intake card when bmvEnabled is false", () => {
    const repository = createRepository();
    const wrapper = mount(CustomerBasicInfoTab, {
      props: {
        customer: bmvCustomer,
        repository,
        bmvEnabled: false,
      },
      global: { plugins: [i18n] },
    });
    expect(wrapper.find(".bmv-intake-card").exists()).toBe(false);
  });

  it("hides BMV intake card when bmvEnabled is undefined (loading state)", () => {
    const { wrapper: w } = factory(bmvCustomer);
    expect(w.find(".bmv-intake-card").exists()).toBe(false);
  });
});
