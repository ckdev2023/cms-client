import { ref, computed, watch, type Ref } from "vue";
import type { DocumentListItem } from "../types";
import { validateRelativePath } from "../validation";

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
  onSubmit: (form: RegisterDocumentForm, version: number) => void;
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
  form: Ref<RegisterDocumentForm>,
  fileNameManuallyEdited: Ref<boolean>,
) {
  watch(
    () => form.value.caseId,
    () => {
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
}

/**
 * 登记资料弹窗的状态管理（P0-CONTRACT §8.1）。
 *
 * @param deps - 依赖注入（allItems + onSubmit）
 * @returns 弹窗状态与操作方法
 */
export function useRegisterDocumentModel(deps: RegisterDocumentDeps) {
  const open = ref(false);
  const form = ref<RegisterDocumentForm>(emptyForm());
  const fileNameManuallyEdited = ref(false);

  const derived = setupComputeds(deps, form);
  setupWatchers(form, fileNameManuallyEdited);

  function openModal(prefilledCaseId?: string, prefilledDocId?: string) {
    form.value = emptyForm();
    fileNameManuallyEdited.value = false;
    if (prefilledCaseId) {
      form.value.caseId = prefilledCaseId;
      if (prefilledDocId) form.value.docItemId = prefilledDocId;
    }
    open.value = true;
  }

  function closeModal() {
    open.value = false;
  }

  function updateField(field: keyof RegisterDocumentForm, value: string) {
    form.value = { ...form.value, [field]: value };
    if (field === "fileName") fileNameManuallyEdited.value = true;
  }

  function submit() {
    if (!derived.canSubmit.value) return;
    deps.onSubmit({ ...form.value }, derived.version.value);
    closeModal();
  }

  return {
    open,
    form,
    fileNameManuallyEdited,
    ...derived,
    openModal,
    closeModal,
    updateField,
    submit,
  };
}
