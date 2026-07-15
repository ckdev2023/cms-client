import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "../../../shared/model/useToast";
import type { DocumentItem } from "../detail/tabs/documents/types";
import type {
  DocumentListItem,
  WaivedReasonCode,
  CompletionRate,
} from "../../documents/types";
import { getProviderLabelKey } from "../../documents/constants";
import { useDocumentListModel } from "../../documents/model/useDocumentListModel";
import {
  useDocumentReviewModel,
  type DocumentReviewDeps,
} from "../../documents/model/useDocumentReviewModel";
import {
  useRegisterDocumentModel,
  type RegisterDocumentDeps,
} from "../../documents/model/useRegisterDocumentModel";
import { useAddDocumentItemModel } from "../../documents/model/useAddDocumentItemModel";
import { createDocumentRepository } from "../../documents/model/DocumentRepository";
import type { DocumentRepository } from "../../documents/model/DocumentRepositoryTypes";
import type { UseToastReturn } from "../../../shared/model/useToast";
import {
  createCaseRepository,
  type CaseRepository,
} from "../api/CaseRepository";
import { buildBootstrapHandler } from "./useCaseDocumentsTabBootstrap";
import { buildGrouping } from "./useCaseDocumentsTabGrouping";

/**
 *
 */
export type CaseDocumentsViewState =
  | "templateMissing"
  | "storageGateBlocked"
  | "empty"
  | "ready";

/**
 * 案件资料 Tab 依赖。
 */
export interface UseCaseDocumentsTabDeps {
  /** 案件 ID（响应式）。 */
  caseId: Ref<string>;
  /** 存储根目录是否已配置。 */
  isStorageRootConfigured: Ref<boolean>;
  /** 服务端指示该案件签证类型是否缺少资料模板配置。 */
  documentTemplateMissing?: Ref<boolean>;
  /** 服务端指示是否允许从资料蓝图补生成清单（与 `documentTemplateMissing` 不一致时以本字段为准展示 CTA）。 */
  checklistBootstrapAvailable?: Ref<boolean>;
  /** 可选注入 repository（测试用）。 */
  repository?: DocumentRepository;
  /** 案件业务编号（用于路径建议）。 */
  caseNo?: Ref<string | undefined>;
  /** 案件类型 code（与详情 `caseType` 同源）；经管签下用于雇主侧资料分组业务化标签。 */
  caseTypeCode?: Ref<string | undefined>;
  /**
   * 写操作（审核 / 退回 / 催办 / 登记 / 引用 / 豁免 / 取消豁免 / 添加项）成功后触发，
   * 用于让父级 `CaseDetailView` 同步刷新顶部「按提供方完成率」卡片与 Tab 计数器
   * （它们读取自 `detail.providerProgress` / `detail.docsCounter`，必须重新拉取 aggregate）。
   * NEW-V11-1 修复：缺少此回调会让 Tab 计数器与详情列表口径分裂。
   */
  onWriteSuccess?: () => void;
  /** 可选注入 CaseRepository（测试用）。 */
  caseRepository?: CaseRepository;
}

type T = ReturnType<typeof useI18n>["t"];

function findListItem(
  item: DocumentItem,
  detail: ComputedRef<DocumentItem[]>,
  list: ComputedRef<readonly DocumentListItem[]>,
): DocumentListItem | undefined {
  const idx = detail.value.indexOf(item);
  if (idx >= 0) return list.value[idx];
  return list.value.find((li) => li.name === item.name);
}

interface WaiveState {
  target: DocumentListItem | undefined;
}

function buildWaiveHandler(
  ws: WaiveState,
  review: ReturnType<typeof useDocumentReviewModel>,
  repo: DocumentRepository,
  toast: UseToastReturn,
  t: T,
  onErr: (e: unknown) => void,
  refresh: () => void,
) {
  return async function handleConfirmWaive() {
    if (!review.canConfirmWaive.value || !ws.target) return;
    try {
      await repo.waive(ws.target.id, {
        reasonCode: review.waiveReasonCode.value as WaivedReasonCode,
        note: review.waiveNote.value.trim() || undefined,
      });
      toast.add({
        title: t("documents.review.toastWaiveTitle"),
        description: t("documents.review.toastWaiveDesc", {
          name: ws.target.name,
        }),
      });
      review.closeWaive();
      ws.target = undefined;
      refresh();
    } catch (error) {
      onErr(error);
    }
  };
}

function buildReviewDeps(
  toast: UseToastReturn,
  t: T,
  repo: DocumentRepository,
  onErr: (e: unknown) => void,
  refresh: () => void,
): DocumentReviewDeps {
  return {
    repository: repo,
    onApproveSuccess(item) {
      toast.add({
        title: t("documents.review.toastApproveTitle"),
        description: t("documents.review.toastApproveDesc", {
          name: item.name,
        }),
      });
      refresh();
    },
    onRejectSuccess(item) {
      toast.add({
        title: t("documents.review.toastRejectTitle"),
        description: t("documents.review.toastRejectDesc", {
          name: item.name,
        }),
        tone: "warning",
      });
      refresh();
    },
    onRemindSuccess(item) {
      toast.add({
        title: t("documents.review.toastRemindTitle"),
        description: t("documents.review.toastRemindDesc", {
          provider: item.name,
        }),
        tone: "info",
      });
      refresh();
    },
    onReferenceSuccess(item) {
      toast.add({
        title: t("documents.review.toastReferenceTitle"),
        description: t("documents.review.toastReferenceDesc", {
          caseName: "",
          docName: item.name,
        }),
      });
      refresh();
    },
    onError: onErr,
  };
}

function buildUnwaiveHandler(
  find: (item: DocumentItem) => DocumentListItem | undefined,
  repo: DocumentRepository,
  toast: UseToastReturn,
  t: T,
  onErr: (e: unknown) => void,
  refresh: () => void,
) {
  return async (item: DocumentItem) => {
    const li = find(item);
    if (!li) return;
    try {
      await repo.unwaive(li.id, { note: null });
      toast.add({
        title: t("documents.review.toastUnwaiveTitle"),
        description: t("documents.review.toastUnwaiveDesc", {
          name: li.name,
        }),
      });
      refresh();
    } catch (error) {
      onErr(error);
    }
  };
}

function buildRowHandlers(
  find: (item: DocumentItem) => DocumentListItem | undefined,
  review: ReturnType<typeof useDocumentReviewModel>,
  register: ReturnType<typeof useRegisterDocumentModel>,
  ws: WaiveState,
  t: T,
  caseTypeCode: Ref<string | undefined>,
) {
  return {
    handleRowApprove: (item: DocumentItem) => {
      const li = find(item);
      if (li) review.openApprove({ id: li.id, name: li.name });
    },
    handleRowReject: (item: DocumentItem) => {
      const li = find(item);
      if (li) review.openReject({ id: li.id, name: li.name });
    },
    handleRowRemind: async (item: DocumentItem) => {
      const li = find(item);
      if (li)
        await review.confirmRemind({
          id: li.id,
          name: t(
            getProviderLabelKey(li.provider, {
              caseTypeCode: caseTypeCode.value,
            }),
          ),
        });
    },
    handleRowRegister: (item: DocumentItem) => {
      const li = find(item);
      if (li) register.openModal(li.caseId, li.id);
    },
    handleRowReference: (item: DocumentItem) => {
      const li = find(item);
      if (li) review.openReference({ id: li.id, name: li.name });
    },
    handleRowWaive: (item: DocumentItem) => {
      const li = find(item);
      if (li) {
        ws.target = li;
        review.openWaive(li.name);
      }
    },
  };
}

function buildAddItem(
  repo: DocumentRepository,
  toast: UseToastReturn,
  t: T,
  onErr: (e: unknown) => void,
  refresh: () => void,
) {
  return useAddDocumentItemModel({
    repository: repo,
    onSuccess: () => {
      toast.add({ title: t("documents.addItem.toastTitle") });
      refresh();
    },
    onError: onErr,
  });
}

const PROVIDER_TO_OWNER_SIDE: Record<string, string> = {
  main_applicant: "applicant",
  dependent_guarantor: "guarantor",
  employer_org: "employer",
  office_internal: "office",
};

function buildRegister(
  deps: UseCaseDocumentsTabDeps,
  listModel: ReturnType<typeof useDocumentListModel>,
  repo: DocumentRepository,
  toast: UseToastReturn,
  t: T,
  onErr: (e: unknown) => void,
  refresh: () => void,
) {
  const caseNoLookup: RegisterDocumentDeps["caseNoLookup"] = () =>
    deps.caseNo?.value ?? null;

  const itemMetaLookup: RegisterDocumentDeps["itemMetaLookup"] = (
    docItemId,
  ) => {
    const item = listModel.items.value.find((i) => i.id === docItemId);
    if (!item) return null;
    const ownerSide = PROVIDER_TO_OWNER_SIDE[item.provider] ?? "applicant";
    return {
      ownerSide,
      checklistItemCode: item.checklistItemCode ?? "doc",
    };
  };

  return useRegisterDocumentModel({
    allItems: () => listModel.items.value,
    repository: repo,
    onSuccess: (form) => {
      const name = form.fileName || form.relativePath.split("/").pop() || "";
      toast.add({
        title: t("documents.register.toastDesc", { fileName: name }),
      });
      refresh();
    },
    onError: onErr,
    isStorageRootConfigured: () => deps.isStorageRootConfigured.value,
    caseNoLookup,
    itemMetaLookup,
  });
}

function buildViewState(
  listModel: ReturnType<typeof useDocumentListModel>,
  deps: UseCaseDocumentsTabDeps,
): ComputedRef<CaseDocumentsViewState> {
  return computed<CaseDocumentsViewState>(() => {
    const items = listModel.items.value;
    if (items.length > 0) return "ready";
    const templateMissing = deps.documentTemplateMissing?.value ?? false;
    const bootstrap = deps.checklistBootstrapAvailable?.value ?? false;
    if (templateMissing && !bootstrap) return "templateMissing";
    if (!deps.isStorageRootConfigured.value) return "storageGateBlocked";
    return "empty";
  });
}

function buildApiCompletionRate(repo: DocumentRepository, caseId: Ref<string>) {
  const apiRate = ref<CompletionRate | null>(null);

  async function fetchRate(id?: string) {
    const target = id ?? caseId.value;
    if (!target) return;
    try {
      apiRate.value = await repo.getCompletionRate(target);
    } catch {
      apiRate.value = null;
    }
  }

  watch(caseId, (id) => fetchRate(id), { immediate: true });

  return { apiRate, fetchRate };
}

function buildWriteModels(
  deps: UseCaseDocumentsTabDeps,
  listModel: ReturnType<typeof useDocumentListModel>,
  repo: DocumentRepository,
  toast: UseToastReturn,
  t: T,
  refresh: () => void,
) {
  const onErr = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    toast.add({ title: msg, tone: "error" });
  };
  const review = useDocumentReviewModel(
    buildReviewDeps(toast, t, repo, onErr, refresh),
  );
  const register = buildRegister(
    deps,
    listModel,
    repo,
    toast,
    t,
    onErr,
    refresh,
  );
  const addItem = buildAddItem(repo, toast, t, onErr, refresh);
  return { review, register, addItem, onErr };
}

/**
 * 案件详情资料清单 Tab 的组合式 model。
 *
 * @param deps - 依赖注入
 * @returns 列表 model、分组、审核/登记 model 与事件处理器
 */
// eslint-disable-next-line max-lines-per-function -- wiring：列表刷新、分组与审核动作共享闭包
export function useCaseDocumentsTab(deps: UseCaseDocumentsTabDeps) {
  const { t } = useI18n();
  const toast = useToast();
  const caseTypeCodeRef =
    deps.caseTypeCode ?? ref<string | undefined>(undefined);
  const repo = deps.repository ?? createDocumentRepository();
  const listModel = useDocumentListModel({
    repository: repo,
    fallbackToFixturesWhenEmpty: false,
    params: { caseId: deps.caseId.value },
  });

  const { apiRate, fetchRate } = buildApiCompletionRate(repo, deps.caseId);

  watch(deps.caseId, (caseId) => {
    listModel.refresh({ caseId });
  });

  const { detailItems, documentGroups } = buildGrouping(
    listModel,
    t,
    caseTypeCodeRef,
  );
  const hasApiData = computed(() => listModel.source.value === "api");
  const viewState = buildViewState(listModel, deps);
  const refresh = () => {
    listModel.refresh();
    void fetchRate();
    deps.onWriteSuccess?.();
  };
  const caseRepo = deps.caseRepository ?? createCaseRepository();
  const { bootstrapping, handleBootstrapChecklist } = buildBootstrapHandler(
    deps.caseId,
    caseRepo,
    toast,
    t,
    refresh,
  );
  const { review, register, addItem, onErr } = buildWriteModels(
    deps,
    listModel,
    repo,
    toast,
    t,
    refresh,
  );
  const ws: WaiveState = { target: undefined };
  const find = (item: DocumentItem) =>
    findListItem(item, detailItems, listModel.items);

  return {
    listModel,
    documentGroups,
    hasApiData,
    viewState,
    apiCompletionRate: apiRate,
    bootstrapping,
    handleBootstrapChecklist,
    review,
    register,
    addItem,
    ...buildRowHandlers(find, review, register, ws, t, caseTypeCodeRef),
    handleRowUnwaive: buildUnwaiveHandler(find, repo, toast, t, onErr, refresh),
    handleConfirmWaive: buildWaiveHandler(
      ws,
      review,
      repo,
      toast,
      t,
      onErr,
      refresh,
    ),
    handleConfirmReference: () => review.confirmReference(),
    handleRegisterClick: (id: string) => register.openModal(id),
    handleAddItemClick: (caseId: string) => addItem.openModal(caseId),
  };
}
