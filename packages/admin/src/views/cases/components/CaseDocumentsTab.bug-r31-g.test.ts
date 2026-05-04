import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, computed } from "vue";
import { createI18n } from "vue-i18n";
import CaseDocumentsTab from "./CaseDocumentsTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail, DocumentGroup, DocumentItem } from "../types-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

vi.mock("../../../shared/model/useOrgSettings", () => ({
  useOrgSettings: () => ({ isStorageRootConfigured: ref(true) }),
}));

vi.mock("../model/useCaseDocumentsTab", () => ({
  useCaseDocumentsTab: () => ({
    listModel: { loading: ref(false), items: ref([]) },
    documentGroups: ref<DocumentGroup[]>([]),
    hasApiData: ref(false),
    apiCompletionRate: ref(null),
    review: {
      approveOpen: ref(false),
      rejectOpen: ref(false),
      waiveOpen: ref(false),
      referenceOpen: ref(false),
      rejectReason: ref(""),
      canConfirmReject: ref(false),
      canConfirmWaive: ref(false),
      canConfirmReference: ref(false),
      waiveTargetLabel: ref(""),
      waiveReasonCode: ref(""),
      waiveNote: ref(""),
      waiveNoteRequired: computed(() => false),
      referenceTarget: ref(null),
      referenceCandidates: ref([]),
      selectedReferenceId: ref(null),
      referenceCandidatesLoading: ref(false),
      approveTarget: ref(null),
      rejectTarget: ref(null),
      closeApprove: vi.fn(),
      confirmApprove: vi.fn(),
      closeReject: vi.fn(),
      confirmReject: vi.fn(),
      closeWaive: vi.fn(),
      closeReference: vi.fn(),
    },
    register: {
      open: ref(false),
      form: ref({ caseId: "", docItemId: "", relativePath: "" }),
      pathError: ref(""),
      caseOptions: ref([]),
      docItemOptions: ref([]),
      versionLabel: ref(""),
      canSubmit: ref(false),
      closeModal: vi.fn(),
      updateField: vi.fn(),
      submit: vi.fn(),
    },
    addItem: {
      open: ref(false),
      form: ref({ name: "", ownerSide: "", dueAt: "", note: "" }),
      canSubmit: ref(false),
      submitting: ref(false),
      closeModal: vi.fn(),
      updateField: vi.fn(),
      submit: vi.fn(),
    },
    handleRowApprove: vi.fn(),
    handleRowReject: vi.fn(),
    handleRowRemind: vi.fn(),
    handleRowRegister: vi.fn(),
    handleRowReference: vi.fn(),
    handleRowWaive: vi.fn(),
    handleConfirmWaive: vi.fn(),
    handleConfirmReference: vi.fn(),
    handleRegisterClick: vi.fn(),
    handleAddItemClick: vi.fn(),
  }),
}));

function makeItem(status: string): DocumentItem {
  return { name: "doc", meta: "", status, statusLabelKey: "" };
}

function makeGroup(group: string, items: DocumentItem[]): DocumentGroup {
  return { group, count: "", items };
}

const COMPONENT_STUBS = {
  Card: {
    template:
      "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
  },
  Button: { template: "<button><slot /></button>" },
  CaseDocumentRow: { template: "<tr />" },
  RegisterDocumentModal: { template: "<div />" },
  ReviewDocumentModal: { template: "<div />" },
  WaiveReasonModal: { template: "<div />" },
  ReferenceVersionModal: { template: "<div />" },
  AddDocumentItemModal: { template: "<div />" },
};

function mountTab(locale: Locale, detail: CaseDetail, readonly = false) {
  return mount(CaseDocumentsTab, {
    props: { detail, readonly },
    global: {
      plugins: [makeI18n(locale)],
      stubs: COMPONENT_STUBS,
    },
  });
}

function buildDetail(groups: DocumentGroup[]): CaseDetail {
  return { ...CASE_DETAIL_SAMPLES.work, documents: groups };
}

describe("R31-G: document completion label uses i18n (no hardcoded Chinese)", () => {
  const mixedGroups: DocumentGroup[] = [
    makeGroup("申请人提供", [
      makeItem("approved"),
      makeItem("waiting_upload"),
      makeItem("waived"),
    ]),
  ];

  const allWaivedGroups: DocumentGroup[] = [
    makeGroup("申请人提供", [makeItem("waived"), makeItem("waived")]),
  ];

  describe("zh-CN completion label", () => {
    it("renders collected/total with zh format", () => {
      const html = mountTab("zh-CN", buildDetail(mixedGroups)).html();
      expect(html).toContain("1 / 2 完成");
    });

    it("renders empty label when all waived", () => {
      const html = mountTab("zh-CN", buildDetail(allWaivedGroups)).html();
      expect(html).toContain("无必需资料");
    });
  });

  describe("en-US completion label", () => {
    it("renders collected/total with en format", () => {
      const html = mountTab("en-US", buildDetail(mixedGroups)).html();
      expect(html).toContain("1 / 2 completed");
      expect(html).not.toContain("完成");
    });

    it("renders empty label when all waived", () => {
      const html = mountTab("en-US", buildDetail(allWaivedGroups)).html();
      expect(html).toContain("No required documents");
      expect(html).not.toContain("无必需资料");
    });
  });

  describe("ja-JP completion label", () => {
    it("renders collected/total with ja format", () => {
      const html = mountTab("ja-JP", buildDetail(mixedGroups)).html();
      expect(html).toContain("1 / 2 完了");
      expect(html).not.toContain("1 / 2 完成");
    });

    it("renders empty label when all waived", () => {
      const html = mountTab("ja-JP", buildDetail(allWaivedGroups)).html();
      expect(html).toContain("必須書類なし");
      expect(html).not.toContain("无必需资料");
    });
  });

  describe("overall progress label uses i18n", () => {
    it("zh-CN overall shows collected/total", () => {
      const detail = buildDetail(mixedGroups);
      const html = mountTab("zh-CN", detail).html();
      expect(html).toContain("1 / 2 完成");
      expect(html).toContain("50%");
    });

    it("en-US overall shows completed", () => {
      const detail = buildDetail(mixedGroups);
      const html = mountTab("en-US", detail).html();
      expect(html).toContain("1 / 2 completed");
      expect(html).toContain("50%");
    });

    it("ja-JP overall shows 完了", () => {
      const detail = buildDetail(mixedGroups);
      const html = mountTab("ja-JP", detail).html();
      expect(html).toContain("1 / 2 完了");
      expect(html).toContain("50%");
    });
  });
});
