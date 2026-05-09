import { ref, computed, watch, type Ref, type ComputedRef } from "vue";
import type { DocumentListItem } from "../types";
import {
  validateRelativePath,
  normalizeRelativePathFront,
} from "../validation";
import type { DocumentRepository } from "./DocumentRepositoryTypes";

/**
 *
 */
export interface RegisterDocumentForm {
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  docItemId: string;
  /**
   *
   */
  relativePath: string;
  /**
   *
   */
  fileName: string;
}

/**
 *
 */
export interface DocItemOption {
  /**
   *
   */
  value: string;
  /**
   *
   */
  label: string;
}

/**
 *
 */
export interface CaseOption {
  /**
   *
   */
  value: string;
  /**
   *
   */
  label: string;
}

/**
 *
 */
export interface RegisterDocumentDeps {
  /**
   *
   */
  allItems: () => readonly DocumentListItem[];
  /**
   *
   */
  repository: Pick<DocumentRepository, "uploadLocalArchive">;
  /**
   *
   */
  onSuccess?: (form: RegisterDocumentForm) => void;
  /**
   *
   */
  onError?: (error: unknown) => void;
  /**
   *
   */
  isStorageRootConfigured?: () => boolean;
  /** 根据 caseId 查找案件业务编号（如 `A2026-001`）。 */
  caseNoLookup?: (caseId: string) => string | null;
  /** 根据 docItemId 查找资料项元数据（ownerSide + checklistItemCode）。 */
  itemMetaLookup?: (docItemId: string) => {
    ownerSide: string;
    checklistItemCode: string;
  } | null;
}

const NON_REGISTERABLE = new Set(["approved", "waived"]);

function emptyForm(): RegisterDocumentForm {
  return { caseId: "", docItemId: "", relativePath: "", fileName: "" };
}

function deriveCaseOptions(items: readonly DocumentListItem[]): CaseOption[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (!seen.has(item.caseId)) seen.set(item.caseId, item.caseName);
  }
  return Array.from(seen, ([value, label]) => ({ value, label }));
}

function deriveDocItemOptions(
  items: readonly DocumentListItem[],
  caseId: string,
): DocItemOption[] {
  if (!caseId) return [];
  return items
    .filter((d) => d.caseId === caseId && !NON_REGISTERABLE.has(d.status))
    .map((d) => ({ value: d.id, label: d.name }));
}

function derivePathTail(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  const parts = trimmed.split("/");
  return parts[parts.length - 1] || "";
}

const UNSAFE_PATH_CHARS_RE = /[\\/:*?"<>|]/g;

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName.replace(UNSAFE_PATH_CHARS_RE, "_");
  const dotIdx = sanitized.lastIndexOf(".");
  if (dotIdx <= 0) return sanitized;
  const name = sanitized.slice(0, dotIdx);
  const ext = sanitized.slice(dotIdx).toLowerCase();
  return name + ext;
}

function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * 路径建议生成器输入。
 */
export interface SuggestPathInput {
  /**
   *
   */
  caseNo: string;
  /**
   *
   */
  ownerSide: string;
  /**
   *
   */
  checklistItemCode: string;
  /**
   *
   */
  fileName: string;
}

/**
 * 根据案件编号、提供方、清单编码和文件名生成建议保管路径。
 *
 * @param input - 路径组成要素
 * @returns 建议的相对路径
 */
export function suggestPath(input: SuggestPathInput): string {
  const { caseNo, ownerSide, checklistItemCode, fileName } = input;
  if (!caseNo || !ownerSide || !checklistItemCode || !fileName) return "";
  const sanitized = sanitizeFileName(fileName);
  if (!sanitized) return "";
  return `${caseNo}/${ownerSide}/${checklistItemCode}/${todayStamp()}_${sanitized}`;
}

function setupComputeds(
  deps: RegisterDocumentDeps,
  form: Ref<RegisterDocumentForm>,
) {
  const pathError = computed(() => {
    const p = form.value.relativePath.trim();
    return p ? validateRelativePath(p) : null;
  });

  const caseOptions = computed(() => deriveCaseOptions(deps.allItems()));

  const docItemOptions = computed(() =>
    deriveDocItemOptions(deps.allItems(), form.value.caseId),
  );

  const selectedDocItem = computed(() =>
    deps.allItems().find((d) => d.id === form.value.docItemId),
  );

  const version = computed(() =>
    selectedDocItem.value ? (selectedDocItem.value.referenceCount ?? 0) + 1 : 1,
  );

  const versionLabel = computed(() => `v${version.value}（系统自动递增）`);

  const canSubmit = computed(() => {
    const f = form.value;
    const p = f.relativePath.trim();
    return (
      f.caseId !== "" &&
      f.docItemId !== "" &&
      p !== "" &&
      validateRelativePath(p) === null
    );
  });

  return {
    pathError,
    caseOptions,
    docItemOptions,
    version,
    versionLabel,
    canSubmit,
  };
}

function setupWatchers(
  deps: RegisterDocumentDeps,
  form: Ref<RegisterDocumentForm>,
  fileNameManuallyEdited: Ref<boolean>,
  pathManuallyEdited: Ref<boolean>,
  skipCaseIdReset: Ref<boolean>,
) {
  watch(
    () => form.value.caseId,
    () => {
      if (skipCaseIdReset.value) {
        skipCaseIdReset.value = false;
        return;
      }
      form.value.docItemId = "";
    },
  );

  watch(
    () => form.value.relativePath,
    (v) => {
      if (!fileNameManuallyEdited.value)
        form.value.fileName = derivePathTail(v);
    },
  );

  watch([() => form.value.caseId, () => form.value.docItemId], () => {
    if (pathManuallyEdited.value) return;
    const { caseId, docItemId } = form.value;
    if (!caseId || !docItemId) return;
    const caseNo = deps.caseNoLookup?.(caseId) ?? null;
    const meta = deps.itemMetaLookup?.(docItemId) ?? null;
    if (!caseNo || !meta) return;
    form.value.relativePath = `${caseNo}/${meta.ownerSide}/${meta.checklistItemCode}/`;
  });
}

async function executeSubmit(
  deps: RegisterDocumentDeps,
  form: Ref<RegisterDocumentForm>,
  submitting: Ref<boolean>,
  closeModal: () => void,
) {
  submitting.value = true;
  try {
    const f = form.value;
    await deps.repository.uploadLocalArchive({
      requirementId: f.docItemId,
      fileName: f.fileName || derivePathTail(f.relativePath),
      relativePath: f.relativePath.trim(),
    });
    const snapshot = { ...f };
    closeModal();
    deps.onSuccess?.(snapshot);
  } catch (error) {
    deps.onError?.(error);
  } finally {
    submitting.value = false;
  }
}

interface RegisterState {
  open: Ref<boolean>;
  form: Ref<RegisterDocumentForm>;
  fileNameManuallyEdited: Ref<boolean>;
  pathManuallyEdited: Ref<boolean>;
  skipCaseIdReset: Ref<boolean>;
  submitting: Ref<boolean>;
  storageRootConfigured: ComputedRef<boolean>;
  suggestedPath: ComputedRef<string>;
}

function buildActions(
  deps: RegisterDocumentDeps,
  s: RegisterState,
  derived: ReturnType<typeof setupComputeds>,
) {
  const closeModal = () => {
    s.open.value = false;
  };
  return {
    openModal(prefilledCaseId?: string, prefilledDocId?: string) {
      if (!s.storageRootConfigured.value) return;
      s.form.value = emptyForm();
      s.fileNameManuallyEdited.value = false;
      s.pathManuallyEdited.value = false;
      if (prefilledCaseId) {
        s.skipCaseIdReset.value = !!prefilledDocId;
        s.form.value.caseId = prefilledCaseId;
        if (prefilledDocId) s.form.value.docItemId = prefilledDocId;
      }
      s.open.value = true;
    },
    closeModal,
    updateField(field: keyof RegisterDocumentForm, value: string) {
      s.form.value = { ...s.form.value, [field]: value };
      if (field === "fileName") s.fileNameManuallyEdited.value = true;
      if (field === "relativePath") s.pathManuallyEdited.value = true;
    },
    applySuggestedPath() {
      const base = s.suggestedPath.value;
      if (base) {
        s.form.value.relativePath = base + "/";
        s.pathManuallyEdited.value = false;
      }
    },
    resetPath() {
      s.form.value.relativePath = "";
      s.pathManuallyEdited.value = false;
    },
    async submit() {
      if (!derived.canSubmit.value || s.submitting.value) return;
      await executeSubmit(deps, s.form, s.submitting, closeModal);
    },
  };
}

/**
 * 登记资料弹窗的状态管理（P0-CONTRACT §8.1）。
 *
 * @param deps - 依赖注入（allItems + repository + callbacks）
 * @returns 弹窗状态与操作方法
 */
export function useRegisterDocumentModel(deps: RegisterDocumentDeps) {
  const open = ref(false);
  const form = ref<RegisterDocumentForm>(emptyForm());
  const fileNameManuallyEdited = ref(false);
  const pathManuallyEdited = ref(false);
  const skipCaseIdReset = ref(false);
  const submitting = ref(false);
  const storageRootConfigured = computed(
    () => deps.isStorageRootConfigured?.() ?? true,
  );
  const suggestedPath = computed(() => {
    const { caseId, docItemId } = form.value;
    if (!caseId || !docItemId) return "";
    const caseNo = deps.caseNoLookup?.(caseId) ?? null;
    const meta = deps.itemMetaLookup?.(docItemId) ?? null;
    if (!caseNo || !meta) return "";
    return `${caseNo}/${meta.ownerSide}/${meta.checklistItemCode}`;
  });
  const normalizedPath = computed(() =>
    normalizeRelativePathFront(form.value.relativePath),
  );
  const s: RegisterState = {
    open,
    form,
    fileNameManuallyEdited,
    pathManuallyEdited,
    skipCaseIdReset,
    submitting,
    storageRootConfigured,
    suggestedPath,
  };
  const derived = setupComputeds(deps, form);
  setupWatchers(
    deps,
    form,
    fileNameManuallyEdited,
    pathManuallyEdited,
    skipCaseIdReset,
  );
  const actions = buildActions(deps, s, derived);
  return {
    open,
    form,
    fileNameManuallyEdited,
    pathManuallyEdited,
    submitting,
    storageRootConfigured,
    suggestedPath,
    normalizedPath,
    ...derived,
    ...actions,
  };
}
