import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "../../../shared/model/useToast";
import type { DocumentItem } from "../types-detail";
import type { DocumentGroup } from "../types-detail";
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
import { useRegisterDocumentModel } from "../../documents/model/useRegisterDocumentModel";
import { useAddDocumentItemModel } from "../../documents/model/useAddDocumentItemModel";
import { createDocumentRepository } from "../../documents/model/DocumentRepository";
import { toCaseDetailItems } from "../../documents/model/DocumentDetailItemAdapter";
import type { DocumentRepository } from "../../documents/model/DocumentRepositoryTypes";
import type { UseToastReturn } from "../../../shared/model/useToast";

/**
 * 案件资料 Tab 依赖。
 */
export interface UseCaseDocumentsTabDeps {
  /** 案件 ID（响应式）。 */
  caseId: Ref<string>;
  /** 存储根目录是否已配置。 */
  isStorageRootConfigured: Ref<boolean>;
  /** 可选注入 repository（测试用）。 */
  repository?: DocumentRepository;
}

type T = ReturnType<typeof useI18n>["t"];

function buildGrouping(
  listModel: ReturnType<typeof useDocumentListModel>,
  t: T,
) {
  const detailItems = computed(() => toCaseDetailItems(listModel.items.value));
  const documentGroups = computed<DocumentGroup[]>(() => {
    const grouped = new Map<string, DocumentItem[]>();
    const items = listModel.items.value;
    for (let i = 0; i < items.length; i++) {
      const key = items[i].provider;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(detailItems.value[i]);
    }
    return Array.from(grouped.entries()).map(([p, gItems]) => ({
      group: t(getProviderLabelKey(p)),
      count: `${gItems.length} 件`,
      items: gItems,
    }));
  });
  return { detailItems, documentGroups };
}

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

function buildRowHandlers(
  find: (item: DocumentItem) => DocumentListItem | undefined,
  review: ReturnType<typeof useDocumentReviewModel>,
  register: ReturnType<typeof useRegisterDocumentModel>,
  ws: WaiveState,
  t: T,
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
          name: t(getProviderLabelKey(li.provider)),
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

function buildConfirmReference(
  review: ReturnType<typeof useDocumentReviewModel>,
) {
  return async () => {
    await review.confirmReference();
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

function buildRegister(
  deps: UseCaseDocumentsTabDeps,
  listModel: ReturnType<typeof useDocumentListModel>,
  repo: DocumentRepository,
  toast: UseToastReturn,
  t: T,
  onErr: (e: unknown) => void,
  refresh: () => void,
) {
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
export function useCaseDocumentsTab(deps: UseCaseDocumentsTabDeps) {
  const { t } = useI18n();
  const toast = useToast();
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

  const { detailItems, documentGroups } = buildGrouping(listModel, t);
  const hasApiData = computed(() => listModel.source.value === "api");
  const refresh = () => {
    listModel.refresh();
    fetchRate();
  };
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
    apiCompletionRate: apiRate,
    review,
    register,
    addItem,
    ...buildRowHandlers(find, review, register, ws, t),
    handleConfirmWaive: buildWaiveHandler(
      ws,
      review,
      repo,
      toast,
      t,
      onErr,
      refresh,
    ),
    handleConfirmReference: buildConfirmReference(review),
    handleRegisterClick: (id: string) => register.openModal(id),
    handleAddItemClick: (caseId: string) => addItem.openModal(caseId),
  };
}
