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

// 从资料项名称派生文件名时使用：仅去掉路径/控制字符（不强制小写后缀），
// 避免诸如 `在留資格認定/変更許可申請書` 这种业务名称把 `/` 当成路径分隔符
// 导致服务端 `sanitizeFileName` 把斜杠改成下划线、relativePath 与 fileName 不一致。
function sanitizeDerivedFileName(name: string): string {
  return name.replace(UNSAFE_PATH_CHARS_RE, "_").trim();
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

// 实际提交服务端的文件名解析顺序：
// 1) 用户在「资料说明」字段显式填写
// 2) 归档路径末尾（user 直接粘了完整路径例 `case/.../passport.pdf`）
// 3) 所选资料项的 name（建议路径以 `/` 结尾时的兜底，避免空 fileName 触发服务端 400）
function buildFileNameComputeds(
  form: Ref<RegisterDocumentForm>,
  selectedDocItem: ComputedRef<DocumentListItem | undefined>,
) {
  const effectiveFileName = computed<string>(() => {
    const f = form.value;
    const explicit = f.fileName.trim();
    if (explicit) return sanitizeDerivedFileName(explicit);
    const tail = derivePathTail(f.relativePath).trim();
    if (tail) return tail;
    const itemName = selectedDocItem.value?.name?.trim();
    return itemName ? sanitizeDerivedFileName(itemName) : "";
  });
  const fileNameError = computed<string | null>(() => {
    const f = form.value;
    if (!f.caseId || !f.docItemId) return null;
    if (f.relativePath.trim() === "") return null;
    if (effectiveFileName.value !== "") return null;
    return "documents.register.fields.fileNameRequiredError";
  });
  return { effectiveFileName, fileNameError };
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
  const { effectiveFileName, fileNameError } = buildFileNameComputeds(
    form,
    selectedDocItem,
  );
  const canSubmit = computed(() => {
    const f = form.value;
    const p = f.relativePath.trim();
    return (
      f.caseId !== "" &&
      f.docItemId !== "" &&
      p !== "" &&
      validateRelativePath(p) === null &&
      effectiveFileName.value !== ""
    );
  });
  return {
    pathError,
    fileNameError,
    caseOptions,
    docItemOptions,
    version,
    versionLabel,
    canSubmit,
    effectiveFileName,
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
      if (fileNameManuallyEdited.value) return;
      const tail = derivePathTail(v);
      if (tail) {
        form.value.fileName = tail;
        return;
      }
      // 建议路径以 `/` 结尾或路径为空时，回退到所选资料项的名称作为默认文件名，
      // 避免提交时 fileName 为空触发服务端 `Invalid fileName` 校验失败。
      // 资料项名称可能含 `/` 等路径字符（如「在留資格認定/変更許可申請書」），
      // 必须 sanitize 后再写入表单，保证 relativePath 与 fileName 一致。
      const item = deps.allItems().find((d) => d.id === form.value.docItemId);
      form.value.fileName = item?.name
        ? sanitizeDerivedFileName(item.name)
        : "";
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

function composeFullPath(rawPath: string, fileName: string): string {
  const trimmed = rawPath.trim().replace(/\\/g, "/");
  if (!trimmed) return trimmed;
  if (!trimmed.endsWith("/")) return trimmed;
  // 防御性 sanitize：即便上游已 sanitize，也避免 fileName 含 `/` 把目录段拆开，
  // 导致 relativePath 与服务端 sanitizeFileName 出来的 fileName 不一致。
  return trimmed + sanitizeDerivedFileName(fileName);
}

async function executeSubmit(
  deps: RegisterDocumentDeps,
  form: Ref<RegisterDocumentForm>,
  submitting: Ref<boolean>,
  closeModal: () => void,
  effectiveFileName: ComputedRef<string>,
) {
  submitting.value = true;
  try {
    const f = form.value;
    const fileName = effectiveFileName.value;
    const fullPath = composeFullPath(f.relativePath, fileName);
    await deps.repository.uploadLocalArchive({
      requirementId: f.docItemId,
      fileName,
      relativePath: fullPath,
    });
    const snapshot = { ...f, fileName, relativePath: fullPath };
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

// 「使用建议路径」点击后，若用户未手动编辑过资料说明且字段为空，
// 立即用所选资料项的名称兜底；资料项名称可能含 `/`，必须 sanitize 后再写入，
// 否则 relativePath 与服务端最终 sanitize 出的 fileName 会不一致。
function fillFileNameFallback(deps: RegisterDocumentDeps, s: RegisterState) {
  if (s.fileNameManuallyEdited.value) return;
  if (s.form.value.fileName.trim() !== "") return;
  const item = deps.allItems().find((d) => d.id === s.form.value.docItemId);
  if (item?.name) s.form.value.fileName = sanitizeDerivedFileName(item.name);
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
      if (!base) return;
      s.form.value.relativePath = base + "/";
      s.pathManuallyEdited.value = false;
      fillFileNameFallback(deps, s);
    },
    resetPath() {
      s.form.value.relativePath = "";
      s.pathManuallyEdited.value = false;
    },
    async submit() {
      if (!derived.canSubmit.value || s.submitting.value) return;
      await executeSubmit(
        deps,
        s.form,
        s.submitting,
        closeModal,
        derived.effectiveFileName,
      );
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
