import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, computed } from "vue";
import { createI18n } from "vue-i18n";
import CaseDocumentsTab from "./CaseDocumentsTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail, DocumentGroup } from "../types-detail";
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

const EMPTY_DETAIL: CaseDetail = {
  ...CASE_DETAIL_SAMPLES.work,
  documents: [],
};

const NON_EMPTY_DETAIL: CaseDetail = CASE_DETAIL_SAMPLES.work;

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

function mountTab(
  locale: Locale,
  detail: CaseDetail = EMPTY_DETAIL,
  readonly = false,
) {
  return mount(CaseDocumentsTab, {
    props: { detail, readonly },
    global: {
      plugins: [makeI18n(locale)],
      stubs: COMPONENT_STUBS,
    },
  });
}

const ZH_LABELS = [
  "暂无资料登记",
  "该案件尚未添加任何资料需求",
  "登记资料",
  "手动添加",
  "资料登记清单",
  "按提供方完成率",
  "资料收集分组进度",
  "该分组暂无资料项",
];

describe("BUG-169 CaseDocumentsTab i18n: empty state + section labels", () => {
  describe("empty state (isEmpty=true)", () => {
    it("zh-CN renders expected labels", () => {
      const html = mountTab("zh-CN").html();
      expect(html).toContain("暂无资料登记");
      expect(html).toContain("该案件尚未添加任何资料需求");
      expect(html).toContain("登记资料");
      expect(html).toContain("手动添加");
    });

    it("en-US renders English and has no zh leakage", () => {
      const html = mountTab("en-US").html();
      expect(html).toContain("No documents registered yet");
      expect(html).toContain("Register documents");
      expect(html).toContain("Add manually");
      for (const zh of ZH_LABELS) {
        expect(html).not.toContain(zh);
      }
    });

    it("ja-JP renders Japanese and has no zh leakage", () => {
      const html = mountTab("ja-JP").html();
      expect(html).toContain("書類登録なし");
      expect(html).toContain("書類登録");
      expect(html).toContain("手動追加");
      for (const zh of ZH_LABELS) {
        expect(html).not.toContain(zh);
      }
    });
  });

  describe("non-empty state (isEmpty=false)", () => {
    it("zh-CN renders section labels", () => {
      const html = mountTab("zh-CN", NON_EMPTY_DETAIL).html();
      expect(html).toContain("资料登记清单");
      expect(html).toContain("登记资料");
      expect(html).toContain("手动添加");
      expect(html).toContain("按提供方完成率");
      expect(html).toContain("资料收集分组进度");
    });

    it("en-US renders English section labels and drops zh-CN", () => {
      const html = mountTab("en-US", NON_EMPTY_DETAIL).html();
      expect(html).toContain("Document Checklist");
      expect(html).toContain("Register documents");
      expect(html).toContain("Add manually");
      expect(html).toContain("By provider completion");
      expect(html).toContain("Document collection by group");
      for (const zh of ZH_LABELS) {
        expect(html).not.toContain(zh);
      }
    });

    it("ja-JP renders Japanese section labels and drops zh-CN", () => {
      const html = mountTab("ja-JP", NON_EMPTY_DETAIL).html();
      expect(html).toContain("書類登録チェックリスト");
      expect(html).toContain("書類登録");
      expect(html).toContain("手動追加");
      expect(html).toContain("提供者別完成率");
      expect(html).toContain("書類収集グループ別進捗");
      for (const zh of ZH_LABELS) {
        expect(html).not.toContain(zh);
      }
    });
  });

  it("readonly mode hides CTA buttons in empty state", () => {
    const wrapper = mountTab("en-US", EMPTY_DETAIL, true);
    expect(wrapper.html()).toContain("No documents registered yet");
    const buttons = wrapper.findAll("button");
    const buttonTexts = buttons.map((b) => b.text());
    expect(buttonTexts).not.toContain("Register documents");
    expect(buttonTexts).not.toContain("Add manually");
  });
});
