import { describe, it, expect, vi, beforeEach } from "vitest";
import { computed } from "vue";
import {
  getActiveGroupOptions,
  getAllGroupOptions,
  isGroupDisabled,
  resolveGroupLabel,
  ALL_OPTIONS,
} from "../shared/model/useGroupOptions";
import {
  createOrgSettingsController,
  initOrgSettings,
  useOrgSettings,
  resetOrgSettings,
} from "../shared/model/useOrgSettings";
import { useRegisterDocumentModel } from "./documents/model/useRegisterDocumentModel";
import type { RegisterDocumentForm } from "./documents/model/useRegisterDocumentModel";
import type { DocumentListItem } from "./documents/types";
import { CASE_GROUP_OPTIONS } from "./cases/constants";
import { useCustomerBasicInfoModel } from "./customers/model/useCustomerBasicInfoModel";
import type { CustomerDetail } from "./customers/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDocItem(
  overrides: Partial<DocumentListItem> = {},
): DocumentListItem {
  return {
    id: "doc-001",
    name: "パスポート写し",
    caseId: "case-001",
    caseName: "A2026-001 経営管理ビザ新規",
    provider: "main_applicant",
    status: "pending",
    dueDate: null,
    dueDateLabel: "—",
    lastReminderAt: null,
    lastReminderAtLabel: "—",
    relativePath: null,
    sharedExpiryRisk: false,
    referenceCount: 0,
    ...overrides,
  };
}

const DOC_ITEMS: DocumentListItem[] = [
  makeDocItem({ id: "d1", caseId: "c1", caseName: "案件A", status: "pending" }),
];

// ---------------------------------------------------------------------------
// 1. Documents — storage root gate integration
// ---------------------------------------------------------------------------

describe("cross-module — documents storage root gate", () => {
  beforeEach(() => {
    resetOrgSettings();
  });

  it("register modal is blocked when useOrgSettings reports root not configured", () => {
    const ctrl = createOrgSettingsController({
      initialStorageRoot: { rootLabel: null, rootPath: null },
    });

    const onSubmit =
      vi.fn<(form: RegisterDocumentForm, version: number) => void>();
    const model = useRegisterDocumentModel({
      allItems: () => DOC_ITEMS,
      onSubmit,
      isStorageRootConfigured: () => ctrl.isStorageRootConfigured.value,
    });

    model.openModal();
    expect(model.open.value).toBe(false);
  });

  it("register modal opens when useOrgSettings reports root configured", () => {
    const ctrl = createOrgSettingsController({
      initialStorageRoot: {
        rootLabel: "案件資料",
        rootPath: "\\\\fileserver\\docs",
      },
    });

    const onSubmit =
      vi.fn<(form: RegisterDocumentForm, version: number) => void>();
    const model = useRegisterDocumentModel({
      allItems: () => DOC_ITEMS,
      onSubmit,
      isStorageRootConfigured: () => ctrl.isStorageRootConfigured.value,
    });

    model.openModal();
    expect(model.open.value).toBe(true);
  });

  it("gate reacts to storage root being configured after init", () => {
    const ctrl = createOrgSettingsController({
      initialStorageRoot: { rootLabel: null, rootPath: null },
    });

    const onSubmit =
      vi.fn<(form: RegisterDocumentForm, version: number) => void>();
    const model = useRegisterDocumentModel({
      allItems: () => DOC_ITEMS,
      onSubmit,
      isStorageRootConfigured: () => ctrl.isStorageRootConfigured.value,
    });

    model.openModal();
    expect(model.open.value).toBe(false);

    ctrl.storageRoot.value = {
      rootLabel: "New Root",
      rootPath: "\\\\server\\path",
    };

    model.openModal();
    expect(model.open.value).toBe(true);
  });

  it("useOrgSettings singleton flows into register model via dep injection", () => {
    initOrgSettings({
      initialStorageRoot: { rootLabel: null, rootPath: null },
    });
    const settings = useOrgSettings();

    const onSubmit =
      vi.fn<(form: RegisterDocumentForm, version: number) => void>();
    const model = useRegisterDocumentModel({
      allItems: () => DOC_ITEMS,
      onSubmit,
      isStorageRootConfigured: () => settings.isStorageRootConfigured.value,
    });

    model.openModal();
    expect(model.open.value).toBe(false);

    settings.storageRoot.value = {
      rootLabel: "Configured",
      rootPath: "\\\\srv\\root",
    };

    model.openModal();
    expect(model.open.value).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Cases — CASE_GROUP_OPTIONS only contains active groups
// ---------------------------------------------------------------------------

describe("cross-module — cases group options gate", () => {
  it("CASE_GROUP_OPTIONS excludes disabled groups", () => {
    const disabledGroups = ALL_OPTIONS.filter((g) => g.status === "disabled");
    expect(disabledGroups.length).toBeGreaterThan(0);

    for (const disabled of disabledGroups) {
      expect(
        CASE_GROUP_OPTIONS.find((o) => o.value === disabled.value),
      ).toBeUndefined();
    }
  });

  it("CASE_GROUP_OPTIONS matches getActiveGroupOptions output", () => {
    const active = getActiveGroupOptions();
    expect(CASE_GROUP_OPTIONS).toEqual(active);
  });

  it("CASE_GROUP_OPTIONS contains only active groups", () => {
    for (const option of CASE_GROUP_OPTIONS) {
      const source = ALL_OPTIONS.find((g) => g.value === option.value);
      expect(source).toBeDefined();
      expect(source!.status).toBe("active");
    }
  });

  it("disabled group osaka is not in CASE_GROUP_OPTIONS", () => {
    expect(CASE_GROUP_OPTIONS.find((o) => o.value === "osaka")).toBeUndefined();
  });

  it("active groups tokyo-1 and tokyo-2 are in CASE_GROUP_OPTIONS", () => {
    expect(CASE_GROUP_OPTIONS.find((o) => o.value === "tokyo-1")).toBeDefined();
    expect(CASE_GROUP_OPTIONS.find((o) => o.value === "tokyo-2")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Customers — disabled group display and dropdown behavior
// ---------------------------------------------------------------------------

function makeCustomerDetail(group: string): CustomerDetail {
  return {
    id: "cust-001",
    displayName: "李娜（工作签证）",
    legalName: "李娜",
    furigana: "リ ナ",
    customerNumber: "C-0001",
    phone: "080-1111-2222",
    email: "li.na@email.com",
    totalCases: 1,
    activeCases: 0,
    lastContactDate: "2024-06-15",
    lastContactChannel: "電話",
    owner: { name: "田中太郎", initials: "TT" },
    referralSource: "紹介",
    group,
    nationality: "中国",
    gender: "female",
    birthDate: "1990-01-15",
    avatar: "",
    note: "",
    archivedCases: 0,
    caseNames: [],
    lastCaseCreatedDate: null,
  };
}

describe("cross-module — customer group display", () => {
  it("resolveGroupLabel shows disabled suffix for osaka", () => {
    expect(resolveGroupLabel("osaka")).toBe("大阪組（已停用）");
  });

  it("resolveGroupLabel shows plain label for active group", () => {
    expect(resolveGroupLabel("tokyo-1")).toBe("東京一組");
  });

  it("resolveGroupLabel accepts custom i18n suffix", () => {
    expect(resolveGroupLabel("osaka", " (Disabled)")).toBe("大阪組 (Disabled)");
    expect(resolveGroupLabel("osaka", "（停止）")).toBe("大阪組（停止）");
  });

  it("isGroupDisabled returns true for osaka (disabled group)", () => {
    expect(isGroupDisabled("osaka")).toBe(true);
  });

  it("isGroupDisabled returns false for tokyo-1 (active group)", () => {
    expect(isGroupDisabled("tokyo-1")).toBe(false);
  });
});

describe("cross-module — customer basic info group dropdown", () => {
  it("shows only active groups when customer is in active group", () => {
    const customer = computed(() => makeCustomerDetail("tokyo-1"));
    const model = useCustomerBasicInfoModel(customer);
    const groupValues = model.groupOptions.value.map((o) => o.value);
    expect(groupValues).toContain("tokyo-1");
    expect(groupValues).toContain("tokyo-2");
    expect(groupValues).not.toContain("osaka");
  });

  it("appends disabled group with suffix when customer belongs to it", () => {
    const customer = computed(() => makeCustomerDetail("osaka"));
    const model = useCustomerBasicInfoModel(customer);
    const groupValues = model.groupOptions.value.map((o) => o.value);
    expect(groupValues).toContain("osaka");
    const osakaOption = model.groupOptions.value.find(
      (o) => o.value === "osaka",
    );
    expect(osakaOption!.label).toBe("大阪組（已停用）");
  });

  it("active groups in dropdown do not have disabled suffix", () => {
    const customer = computed(() => makeCustomerDetail("osaka"));
    const model = useCustomerBasicInfoModel(customer);
    const tokyo1 = model.groupOptions.value.find((o) => o.value === "tokyo-1");
    expect(tokyo1!.label).toBe("東京一組");
  });
});

// ---------------------------------------------------------------------------
// 4. Leads — disabled group label rendering
// ---------------------------------------------------------------------------

describe("cross-module — leads group label rendering", () => {
  it("resolveGroupLabel renders disabled group for lead display", () => {
    const label = resolveGroupLabel("osaka", "（已停用）");
    expect(label).toBe("大阪組（已停用）");
  });

  it("resolveGroupLabel renders active group for lead display without suffix", () => {
    const label = resolveGroupLabel("tokyo-1", "（已停用）");
    expect(label).toBe("東京一組");
  });

  it("unknown group ID passes through unchanged", () => {
    expect(resolveGroupLabel("unknown-group")).toBe("unknown-group");
  });
});

// ---------------------------------------------------------------------------
// 5. Shared group data integrity
// ---------------------------------------------------------------------------

describe("cross-module — group data integrity", () => {
  it("ALL_OPTIONS has at least one disabled group", () => {
    const disabled = ALL_OPTIONS.filter((g) => g.status === "disabled");
    expect(disabled.length).toBeGreaterThanOrEqual(1);
  });

  it("ALL_OPTIONS has at least two active groups", () => {
    const active = ALL_OPTIONS.filter((g) => g.status === "active");
    expect(active.length).toBeGreaterThanOrEqual(2);
  });

  it("getAllGroupOptions returns complete list including disabled", () => {
    const all = getAllGroupOptions();
    expect(all.length).toBe(ALL_OPTIONS.length);
    expect(all.some((g) => g.status === "disabled")).toBe(true);
  });

  it("getActiveGroupOptions count < getAllGroupOptions count", () => {
    expect(getActiveGroupOptions().length).toBeLessThan(
      getAllGroupOptions().length,
    );
  });

  it("every group in ALL_OPTIONS has a unique value", () => {
    const values = ALL_OPTIONS.map((g) => g.value);
    expect(values).toEqual([...new Set(values)]);
  });

  it("group IDs used in cases/customers/leads exist in ALL_OPTIONS", () => {
    const knownIds = ALL_OPTIONS.map((g) => g.value);
    for (const id of ["tokyo-1", "tokyo-2", "osaka"]) {
      expect(knownIds).toContain(id);
    }
  });
});
