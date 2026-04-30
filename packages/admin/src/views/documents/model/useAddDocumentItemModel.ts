import { ref, computed, type Ref } from "vue";
import type { DocumentProviderType } from "../types";
import type { DocumentRepository } from "./DocumentRepositoryTypes";

/**
 *
 */
export interface AddDocumentItemForm {
  /**
   *
   */
  name: string;
  /**
   *
   */
  ownerSide: DocumentProviderType | "";
  /**
   *
   */
  dueAt: string;
  /**
   *
   */
  note: string;
}

/**
 *
 */
export interface UseAddDocumentItemModelDeps {
  /**
   *
   */
  repository: DocumentRepository;
  /**
   *
   */
  onSuccess: () => void;
  /**
   *
   */
  onError: (error: unknown) => void;
}

function emptyForm(): AddDocumentItemForm {
  return { name: "", ownerSide: "", dueAt: "", note: "" };
}

async function executeCreate(
  deps: UseAddDocumentItemModelDeps,
  caseId: string,
  form: AddDocumentItemForm,
  open: Ref<boolean>,
  submitting: Ref<boolean>,
): Promise<void> {
  submitting.value = true;
  try {
    await deps.repository.createItem({
      caseId,
      checklistItemCode: `manual:${crypto.randomUUID()}`,
      name: form.name.trim(),
      ownerSide: form.ownerSide || undefined,
      dueAt: form.dueAt || null,
      note: form.note.trim() || null,
      category: "standard",
    });
    open.value = false;
    deps.onSuccess();
  } catch (error) {
    deps.onError(error);
  } finally {
    submitting.value = false;
  }
}

/**
 * 手动添加资料项 ViewModel。
 *
 * @param deps - 仓储与回调注入
 * @returns 弹窗状态、表单绑定与提交动作
 */
export function useAddDocumentItemModel(deps: UseAddDocumentItemModelDeps) {
  const open = ref(false);
  const form = ref<AddDocumentItemForm>(emptyForm());
  const submitting = ref(false);
  let activeCaseId = "";

  const canSubmit = computed(
    () =>
      form.value.name.trim().length > 0 &&
      form.value.ownerSide !== "" &&
      !submitting.value,
  );

  return {
    open: computed(() => open.value),
    form: computed(() => form.value),
    canSubmit,
    submitting: computed(() => submitting.value),
    openModal(caseId: string): void {
      activeCaseId = caseId;
      form.value = emptyForm();
      submitting.value = false;
      open.value = true;
    },
    closeModal(): void {
      open.value = false;
    },
    updateField<K extends keyof AddDocumentItemForm>(
      field: K,
      value: AddDocumentItemForm[K],
    ): void {
      form.value = { ...form.value, [field]: value };
    },
    async submit(): Promise<void> {
      if (!canSubmit.value || !activeCaseId) return;
      await executeCreate(deps, activeCaseId, form.value, open, submitting);
    },
  };
}
