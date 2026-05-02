import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../../i18n";
import { SAMPLE_CUSTOMER_DETAILS } from "./fixtures";
import CustomerBasicInfoTab from "./components/CustomerBasicInfoTab.vue";
import CustomerDetailHeader from "./components/CustomerDetailHeader.vue";
import CustomerToast from "./components/CustomerToast.vue";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./model/CustomerRepository";
import CustomerDetailView from "./CustomerDetailView.vue";

type DetailViewRepository = Pick<
  CustomerRepository,
  | "getCustomerDetail"
  | "listRelatedCases"
  | "listRelations"
  | "createRelation"
  | "updateRelation"
  | "listComms"
  | "listLogs"
  | "updateCustomerBasicInfo"
  | "sendBmvQuestionnaire"
  | "generateBmvQuote"
  | "recordBmvSign"
  | "isBmvEnabled"
>;

const mockedRepository = vi.hoisted(() => ({
  current: null as DetailViewRepository | null,
}));

vi.mock("./model/CustomerRepository", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./model/CustomerRepository")>();
  return {
    ...actual,
    createCustomerRepository: vi.fn(() => mockedRepository.current),
  };
});

function createRepository(
  overrides: Partial<DetailViewRepository> = {},
): DetailViewRepository {
  return {
    getCustomerDetail: vi.fn().mockImplementation(async (id: string) => {
      return (
        SAMPLE_CUSTOMER_DETAILS[id] ?? SAMPLE_CUSTOMER_DETAILS["cust-001"]!
      );
    }),
    listRelatedCases: vi.fn().mockResolvedValue([]),
    listRelations: vi.fn().mockResolvedValue([
      {
        id: "rel-001",
        name: "田中花子",
        kana: "",
        relationType: "spouse",
        phone: "090-2222-3333",
        email: "hanako@example.com",
        tags: ["配偶"],
        note: "",
      },
    ]),
    createRelation: vi.fn().mockResolvedValue({
      id: "rel-002",
      name: "新关联人",
      kana: "",
      relationType: "agent",
      phone: "03-1111-2222",
      email: "new@example.com",
      tags: ["顾问"],
      note: "",
    }),
    updateRelation: vi.fn().mockResolvedValue({
      id: "rel-001",
      name: "田中花子",
      kana: "",
      relationType: "spouse",
      phone: "090-2222-3333",
      email: "hanako@example.com",
      tags: ["配偶"],
      note: "",
    }),
    listComms: vi.fn().mockResolvedValue([
      {
        id: "comm-001",
        type: "wechat",
        visibility: "customer",
        occurredAt: "2026-04-01T10:00:00.000Z",
        actor: "田中",
        summary: "确认补件时间表",
        detail: "客户承诺下周前补齐资料。",
        nextAction: "2026-04-02",
      },
    ]),
    listLogs: vi.fn().mockResolvedValue([
      {
        id: "log-001",
        type: "info",
        actor: "田中",
        at: "2026-04-01T11:00:00.000Z",
        message: "更新客户信息",
      },
    ]),
    updateCustomerBasicInfo: vi.fn().mockResolvedValue({ id: "cust-001" }),
    sendBmvQuestionnaire: vi
      .fn()
      .mockResolvedValue({ id: "cust-001", bmvProfile: null }),
    generateBmvQuote: vi
      .fn()
      .mockResolvedValue({ id: "cust-001", bmvProfile: null }),
    recordBmvSign: vi
      .fn()
      .mockResolvedValue({ id: "cust-001", bmvProfile: null }),
    isBmvEnabled: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

let activeWrapper: ReturnType<typeof mount> | null = null;

async function mountView(customerId = "cust-001") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/customers/:id",
        name: "customer-detail",
        component: CustomerDetailView,
      },
      {
        path: "/cases/create",
        name: "case-create",
        component: { template: "<div />" },
      },
    ],
  });

  await router.push(`/customers/${customerId}`);
  await router.isReady();

  const wrapper = mount(CustomerDetailView, {
    global: { plugins: [i18n, router] },
  });

  await flushPromises();
  activeWrapper = wrapper;
  return { wrapper, router };
}

describe("CustomerDetailView", () => {
  beforeEach(() => {
    setAppLocale("en-US");
  });

  afterEach(async () => {
    if (activeWrapper) {
      activeWrapper.unmount();
      activeWrapper = null;
    }
    await flushPromises();
    mockedRepository.current = null;
    document.body.innerHTML = "";
  });

  it("loads customer detail from repository and renders the basic tab", async () => {
    const repository = createRepository();
    mockedRepository.current = repository;

    const { wrapper } = await mountView();

    expect(repository.getCustomerDetail).toHaveBeenCalledWith("cust-001");
    expect(wrapper.text()).toContain("田中太郎");
    expect(wrapper.find(".basic-info__title").text()).toBe("Basic info");
  });

  it("passes repository + refresh callback to basic info tab save flow", async () => {
    const repository = createRepository();
    mockedRepository.current = repository;

    const { wrapper } = await mountView();

    const editBtn = wrapper.findAll("button").find((b) => b.text() === "Edit")!;
    await editBtn.trigger("click");
    await wrapper.find("#basicInfoDisplayName").setValue("田中次郎");

    const saveBtn = wrapper.findAll("button").find((b) => b.text() === "Save")!;
    await saveBtn.trigger("click");
    await flushPromises();

    expect(repository.updateCustomerBasicInfo).toHaveBeenCalledWith(
      "cust-001",
      expect.objectContaining({ displayName: "田中次郎" }),
    );
    expect(repository.getCustomerDetail).toHaveBeenCalledTimes(2);
    expect(wrapper.find(".basic-info__saved-hint").exists()).toBe(true);
  });

  it("passes repository to comms and logs tabs", async () => {
    const repository = createRepository();
    mockedRepository.current = repository;

    const { wrapper } = await mountView();

    const commsTab = wrapper
      .findAll("button")
      .find((b) => b.text() === "Communications")!;
    await commsTab.trigger("click");
    await flushPromises();

    expect(repository.listComms).toHaveBeenCalledWith("cust-001");
    expect(wrapper.text()).toContain("确认补件时间表");

    const logsTab = wrapper
      .findAll("button")
      .find((b) => b.text() === "Activity log")!;
    await logsTab.trigger("click");
    await flushPromises();

    expect(repository.listLogs).toHaveBeenCalledWith("cust-001");
    expect(wrapper.text()).toContain("更新客户信息");
  });

  it("navigates to case create with customer defaults in query when create-case is clicked", async () => {
    const repository = createRepository();
    mockedRepository.current = repository;

    const { wrapper, router } = await mountView();
    const header = wrapper.findComponent(CustomerDetailHeader);
    const createCaseButton = header.findAll("button")[1];

    await createCaseButton.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("case-create");
    expect(router.currentRoute.value.query).toMatchObject({
      customerId: "cust-001",
      customerName: "田中太郎",
      customerKana: "タナカタロウ",
      customerGroup: "tokyo-1",
      customerGroupLabel: "Tokyo Team 1",
      customerContact: "090-1234-5678 / tanaka@example.com",
    });
  });

  it("navigates to family bulk case create with customer defaults in query when batch-create-case is clicked", async () => {
    const repository = createRepository();
    mockedRepository.current = repository;

    const { wrapper, router } = await mountView();
    const header = wrapper.findComponent(CustomerDetailHeader);
    const batchCreateButton = header.findAll("button")[0];

    await batchCreateButton.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("case-create");
    expect(router.currentRoute.value.hash).toBe("#family-bulk");
    expect(router.currentRoute.value.query).toMatchObject({
      customerId: "cust-001",
      customerName: "田中太郎",
      customerKana: "タナカタロウ",
      customerGroup: "tokyo-1",
      customerGroupLabel: "Tokyo Team 1",
      customerContact: "090-1234-5678 / tanaka@example.com",
    });
    expect(router.currentRoute.value.query.templateId).toBeUndefined();
  });

  it("passes explicit bmv template for signed BMV customers on single create", async () => {
    const repository = createRepository({
      getCustomerDetail: vi.fn().mockResolvedValue({
        ...SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
        bmvProfile: {
          ...SAMPLE_CUSTOMER_DETAILS["cust-004"]!.bmvProfile!,
          signStatus: "signed",
          intakeStatus: "ready_for_case_creation",
          signedAt: "2026-04-10T10:00:00.000Z",
        },
      }),
    });
    mockedRepository.current = repository;

    const { wrapper, router } = await mountView("cust-004");
    const header = wrapper.findComponent(CustomerDetailHeader);
    const createCaseButton = header.findAll("button")[1];

    await createCaseButton.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("case-create");
    expect(router.currentRoute.value.query).toMatchObject({
      customerId: "cust-004",
      templateId: "bmv",
      customerGroup: "tokyo-1",
      customerGroupLabel: "Tokyo Team 1",
      bmvQuestionnaireStatus: "returned",
      bmvQuoteStatus: "confirmed",
      bmvSignStatus: "signed",
      bmvIntakeStatus: "ready_for_case_creation",
    });
  });

  it("passes BMV statuses through transition-to-case entry for signed customers", async () => {
    const repository = createRepository({
      getCustomerDetail: vi.fn().mockResolvedValue({
        ...SAMPLE_CUSTOMER_DETAILS["cust-004"]!,
        bmvProfile: {
          ...SAMPLE_CUSTOMER_DETAILS["cust-004"]!.bmvProfile!,
          signStatus: "signed",
          intakeStatus: "ready_for_case_creation",
          signedAt: "2026-04-10T10:00:00.000Z",
        },
      }),
    });
    mockedRepository.current = repository;

    const { wrapper, router } = await mountView("cust-004");
    const basicInfoTab = wrapper.findComponent(CustomerBasicInfoTab);

    basicInfoTab.vm.$emit("transition-to-case");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("case-create");
    expect(router.currentRoute.value.query).toMatchObject({
      customerId: "cust-004",
      templateCode: "bmv",
      templateId: "bmv",
      sourceLeadId: "lead-bmv-004",
      ownerUserId: "takahashi-k",
      customerGroup: "tokyo-1",
      bmvQuestionnaireStatus: "returned",
      bmvQuoteStatus: "confirmed",
      bmvSignStatus: "signed",
      bmvIntakeStatus: "ready_for_case_creation",
    });
  });

  it("disables create-case entry points and blocks guarded navigation for unsigned BMV customers", async () => {
    const repository = createRepository();
    mockedRepository.current = repository;

    const { wrapper, router } = await mountView("cust-004");
    const header = wrapper.findComponent(CustomerDetailHeader);
    const [batchCreateButton, createCaseButton] = header.findAll("button");

    expect(batchCreateButton?.attributes("disabled")).toBeDefined();
    expect(createCaseButton?.attributes("disabled")).toBeDefined();
    expect(header.text()).toContain(
      "BMV customers must complete signing before a case can be created.",
    );

    header.vm.$emit("createCase");
    await flushPromises();

    const toast = wrapper.findComponent(CustomerToast);
    expect(toast.props("visible")).toBe(true);
    expect(toast.props("title")).toBe("Case creation is locked");
    expect(toast.props("description")).toBe(
      "BMV customers must complete signing before a case can be created.",
    );
    expect(router.currentRoute.value.name).toBe("customer-detail");
  });

  it("disables contacts-tab batch create entry for unsigned BMV customers", async () => {
    const repository = createRepository();
    mockedRepository.current = repository;

    const { wrapper, router } = await mountView("cust-004");
    const contactsTab = wrapper
      .findAll("button")
      .find((button) => button.text() === "Contacts")!;
    await contactsTab.trigger("click");
    await flushPromises();

    expect(repository.listRelations).toHaveBeenCalledWith("cust-004");

    const batchButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Batch create cases for contacts")!;
    expect(batchButton.attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain(
      "BMV customers must complete signing before a case can be created.",
    );

    await batchButton.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("customer-detail");
  });

  it("wires BMV sign action to repository and refreshes detail", async () => {
    const repository = createRepository({
      recordBmvSign: vi.fn().mockResolvedValue({
        id: "cust-004",
        bmvProfile: SAMPLE_CUSTOMER_DETAILS["cust-004"]!.bmvProfile,
      }),
    });
    mockedRepository.current = repository;

    const { wrapper } = await mountView("cust-004");

    const signButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Record signing");
    await signButton?.trigger("click");
    await flushPromises();

    expect(repository.recordBmvSign).toHaveBeenCalledWith("cust-004");
    expect(repository.getCustomerDetail).toHaveBeenCalledTimes(2);
  });

  it("renders unauthorized fallback instead of blank state", async () => {
    const repository = createRepository({
      getCustomerDetail: vi.fn().mockRejectedValue(
        new CustomerRepositoryError({
          code: "UNAUTHORIZED",
          message: "forbidden",
          status: 403,
        }),
      ),
    });
    mockedRepository.current = repository;

    const { wrapper } = await mountView();

    expect(wrapper.text()).toContain(
      "You do not have access to this customer.",
    );
    expect(wrapper.text()).toContain("Back to customers");
  });

  it("renders request-failed fallback and retries loading", async () => {
    const repository = createRepository({
      getCustomerDetail: vi
        .fn()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce(SAMPLE_CUSTOMER_DETAILS["cust-001"]!),
    });
    mockedRepository.current = repository;

    const { wrapper } = await mountView();

    expect(wrapper.text()).toContain("Couldn't load this customer right now.");

    const retryButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Retry");
    expect(retryButton).toBeDefined();

    await retryButton!.trigger("click");
    await flushPromises();

    expect(repository.getCustomerDetail).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("田中太郎");
  });
});
