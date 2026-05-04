import { describe, expect, it, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { i18n, setAppLocale } from "../../i18n";
import documentsZhCN from "../../i18n/messages/documents/zh-CN";
import documentsEnUS from "../../i18n/messages/documents/en-US";
import documentsJaJP from "../../i18n/messages/documents/ja-JP";
import { useDocumentFilters } from "./model/useDocumentFilters";
import {
  useDocumentListModel,
  DEFAULT_PAGE_SIZE,
} from "./model/useDocumentListModel";
import {
  DocumentRepositoryError,
  type DocumentRepository,
  type PaginatedListResult,
} from "./model/DocumentRepository";
import type { DocumentListItem } from "./types";

const API_ROWS: DocumentListItem[] = [
  {
    id: "doc-api-1",
    name: "パスポート写し",
    caseId: "case-1",
    caseName: "A2026-001",
    provider: "main_applicant",
    status: "uploaded_reviewing",
    dueDate: "2026-04-20",
    dueDateLabel: "2026-04-20",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
  {
    id: "doc-api-2",
    name: "在留カード写し",
    caseId: "case-1",
    caseName: "A2026-001",
    provider: "main_applicant",
    status: "pending",
    dueDate: "2026-04-25",
    dueDateLabel: "2026-04-25",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
  {
    id: "doc-api-3",
    name: "雇用契約書",
    caseId: "case-2",
    caseName: "A2026-002",
    provider: "employer_org",
    status: "approved",
    dueDate: "2026-04-15",
    dueDateLabel: "2026-04-15",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 1,
  },
];

function makeRepository(
  result?: DocumentListItem[] | (() => Promise<PaginatedListResult>),
): DocumentRepository {
  const items = result ?? API_ROWS;
  return {
    listDocuments: vi.fn(async () => {
      if (typeof items === "function") return items();
      return { items, total: items.length };
    }),
    transition: vi.fn(),
    followUp: vi.fn(),
    waive: vi.fn(),
    uploadLocalArchive: vi.fn(),
    listFiles: vi.fn(),
    getCompletionRate: vi.fn(),
    createItem: vi.fn(),
  } satisfies DocumentRepository;
}

describe("DocumentListView wiring — model.items driven", () => {
  it("renders model items from API, not fixtures", async () => {
    const repo = makeRepository();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();

    expect(model.items.value).toEqual(API_ROWS);
    expect(model.source.value).toBe("api");
    expect(repo.listDocuments).toHaveBeenCalledTimes(1);
  });

  it("starts with empty items when fallback is disabled", () => {
    const repo = makeRepository();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    expect(model.items.value).toEqual([]);
    expect(model.loading.value).toBe(true);
  });
});

describe("DocumentListView wiring — loading / error", () => {
  it("loading is true while fetching", () => {
    const repo = makeRepository();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    expect(model.loading.value).toBe(true);
  });

  it("loading becomes false after fetch completes", async () => {
    const repo = makeRepository();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(model.loading.value).toBe(false);
  });

  it("loading becomes false even after error", async () => {
    const repo = makeRepository(async () => {
      throw new DocumentRepositoryError({
        code: "NETWORK",
        message: "fail",
      });
    });
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(model.loading.value).toBe(false);
    expect(model.errorCode.value).toBe("requestFailed");
  });

  it("errorCode is 'unauthorized' on 401", async () => {
    const repo = makeRepository(async () => {
      throw new DocumentRepositoryError({
        code: "UNAUTHORIZED",
        message: "denied",
        status: 401,
      });
    });
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(model.errorCode.value).toBe("unauthorized");
  });

  it("errorCode is 'requestFailed' on network error", async () => {
    const repo = makeRepository(async () => {
      throw new DocumentRepositoryError({
        code: "NETWORK",
        message: "network down",
      });
    });
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(model.errorCode.value).toBe("requestFailed");
  });

  it("errorCode is 'badResponse' on malformed API response", async () => {
    const repo = makeRepository(async () => {
      throw new DocumentRepositoryError({
        code: "BAD_RESPONSE",
        message: "missing items",
        status: 200,
      });
    });
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(model.errorCode.value).toBe("badResponse");
    expect(model.items.value).toEqual([]);
  });

  it("retry clears error and re-fetches", async () => {
    let callCount = 0;
    const repo = makeRepository(async () => {
      callCount++;
      if (callCount === 1) {
        throw new DocumentRepositoryError({
          code: "NETWORK",
          message: "fail",
        });
      }
      return { items: API_ROWS, total: API_ROWS.length };
    });
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();
    expect(model.errorCode.value).toBe("requestFailed");

    await model.refresh();
    expect(model.errorCode.value).toBeNull();
    expect(model.items.value).toEqual(API_ROWS);
  });
});

describe("DocumentListView wiring — filter → API params", () => {
  let filters: ReturnType<typeof useDocumentFilters>;
  let repo: DocumentRepository;
  let model: ReturnType<typeof useDocumentListModel>;

  beforeEach(async () => {
    filters = useDocumentFilters();
    repo = makeRepository();
    model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
      params: filters.apiParams.value,
    });
    await flushPromises();
    vi.mocked(repo.listDocuments).mockClear();
  });

  it("'missing' status expands to statusIn=['pending','waiting_upload','revision_required']", async () => {
    filters.status.value = "missing";
    await nextTick();
    await model.refresh(filters.apiParams.value);
    expect(repo.listDocuments).toHaveBeenCalledWith({
      statusIn: ["pending", "waiting_upload", "revision_required"],
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("'expired' status maps to statusIn=['expired']", async () => {
    filters.status.value = "expired";
    await nextTick();
    await model.refresh(filters.apiParams.value);
    expect(repo.listDocuments).toHaveBeenCalledWith({
      statusIn: ["expired"],
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("provider maps to ownerSide", async () => {
    filters.provider.value = "dependent_guarantor";
    await nextTick();
    await model.refresh(filters.apiParams.value);
    expect(repo.listDocuments).toHaveBeenCalledWith({
      ownerSide: "guarantor",
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("caseId passes through to API", async () => {
    filters.caseId.value = "case-1";
    await nextTick();
    await model.refresh(filters.apiParams.value);
    expect(repo.listDocuments).toHaveBeenCalledWith({
      caseId: "case-1",
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("'pending' status maps to statusIn=['pending','waiting_upload']", async () => {
    filters.status.value = "pending";
    await nextTick();
    await model.refresh(filters.apiParams.value);
    expect(repo.listDocuments).toHaveBeenCalledWith({
      statusIn: ["pending", "waiting_upload"],
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("'rejected' status maps to statusIn=['revision_required']", async () => {
    filters.status.value = "rejected";
    await nextTick();
    await model.refresh(filters.apiParams.value);
    expect(repo.listDocuments).toHaveBeenCalledWith({
      statusIn: ["revision_required"],
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("'uploaded_reviewing' passes as direct status param", async () => {
    filters.status.value = "uploaded_reviewing";
    await nextTick();
    await model.refresh(filters.apiParams.value);
    expect(repo.listDocuments).toHaveBeenCalledWith({
      status: "uploaded_reviewing",
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("search is client-side only — never sent to API params", async () => {
    filters.search.value = "パスポート";
    await nextTick();
    await model.refresh(filters.apiParams.value);
    expect(repo.listDocuments).toHaveBeenCalledWith({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("combined filters produce merged API params", async () => {
    filters.status.value = "missing";
    filters.caseId.value = "case-1";
    filters.provider.value = "employer_org";
    await nextTick();
    await model.refresh(filters.apiParams.value);
    expect(repo.listDocuments).toHaveBeenCalledWith({
      statusIn: ["pending", "waiting_upload", "revision_required"],
      caseId: "case-1",
      ownerSide: "employer",
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("resetFilters produces empty API params", async () => {
    filters.status.value = "missing";
    filters.caseId.value = "case-1";
    filters.provider.value = "employer_org";
    await nextTick();
    await model.refresh(filters.apiParams.value);
    vi.mocked(repo.listDocuments).mockClear();

    filters.resetFilters();
    await nextTick();
    await model.refresh(filters.apiParams.value);
    expect(repo.listDocuments).toHaveBeenCalledWith({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });
});

describe("DocumentListView wiring — watch(apiParams) simulation", () => {
  it("filter change triggers refresh with new params and resets page", async () => {
    const repo = makeRepository(() =>
      Promise.resolve({ items: API_ROWS, total: 100 }),
    );
    const filters = useDocumentFilters();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
      params: filters.apiParams.value,
    });
    await flushPromises();

    model.nextPage();
    await flushPromises();
    expect(model.page.value).toBe(2);
    vi.mocked(repo.listDocuments).mockClear();

    filters.status.value = "expired";
    await nextTick();
    await model.refresh(filters.apiParams.value);
    expect(model.page.value).toBe(1);
    expect(repo.listDocuments).toHaveBeenCalledWith({
      statusIn: ["expired"],
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });

  it("subsequent refresh without args re-uses last filter params", async () => {
    const repo = makeRepository(() =>
      Promise.resolve({ items: API_ROWS, total: 100 }),
    );
    const filters = useDocumentFilters();
    const model = useDocumentListModel({
      repository: repo,
      fallbackToFixturesWhenEmpty: false,
    });
    await flushPromises();

    filters.status.value = "missing";
    filters.provider.value = "main_applicant";
    await nextTick();
    await model.refresh(filters.apiParams.value);
    vi.mocked(repo.listDocuments).mockClear();

    await model.refresh();
    expect(repo.listDocuments).toHaveBeenCalledWith({
      statusIn: ["pending", "waiting_upload", "revision_required"],
      ownerSide: "applicant",
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    });
  });
});

describe("DocumentListView — storageGate alert inline link", () => {
  const routerLinkStub = {
    props: ["to"],
    template: '<a class="router-link" :href="String(to)"><slot /></a>',
  };

  function mountAlertFragment(locale: "zh-CN" | "en-US" | "ja-JP") {
    setAppLocale(locale);
    return mount(
      {
        template: `
          <i18n-t
            keypath="documents.storageGate.description"
            tag="p"
          >
            <template #link>
              <RouterLink
                to="/settings?tab=storage-root"
              >
                {{ $t("documents.storageGate.settingsLinkText") }}
              </RouterLink>
            </template>
          </i18n-t>
        `,
      },
      {
        global: {
          plugins: [i18n],
          stubs: { RouterLink: routerLinkStub },
        },
      },
    );
  }

  it("i18n description keys contain {link} placeholder in all locales", () => {
    expect(documentsZhCN.storageGate.description).toContain("{link}");
    expect(documentsEnUS.storageGate.description).toContain("{link}");
    expect(documentsJaJP.storageGate.description).toContain("{link}");
  });

  it("i18n settingsLinkText keys exist in all locales", () => {
    expect(documentsZhCN.storageGate.settingsLinkText).toBeTruthy();
    expect(documentsEnUS.storageGate.settingsLinkText).toBeTruthy();
    expect(documentsJaJP.storageGate.settingsLinkText).toBeTruthy();
  });

  it("renders a link to /settings in zh-CN", () => {
    const wrapper = mountAlertFragment("zh-CN");
    const link = wrapper.find("a.router-link");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toContain("/settings");
    expect(link.text()).toBe("前往「系统设置」");
  });

  it("renders a link to /settings in en-US", () => {
    const wrapper = mountAlertFragment("en-US");
    const link = wrapper.find("a.router-link");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toContain("/settings");
    expect(link.text()).toBe("configure it in System Settings");
  });

  it("renders a link to /settings in ja-JP", () => {
    const wrapper = mountAlertFragment("ja-JP");
    const link = wrapper.find("a.router-link");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toContain("/settings");
    expect(link.text()).toBe("「システム設定」");
  });

  it("link href includes tab=storage-root query", () => {
    const wrapper = mountAlertFragment("zh-CN");
    const link = wrapper.find("a.router-link");
    expect(link.attributes("href")).toBe("/settings?tab=storage-root");
  });
});
