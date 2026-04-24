import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import type { CustomerRelation, CustomerRelationFormFields } from "../types";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./CustomerRepository";

type CustomerContactsRepository = Pick<
  CustomerRepository,
  "createRelation" | "listRelations" | "updateRelation"
>;

type CustomerContactsModelErrorCode = "unauthorized" | "requestFailed";
type CustomerContactsSaveErrorCode = "requestFailed" | "validation";

type UseCustomerContactsModelInput = {
  customerId: Ref<string>;
  repository: CustomerContactsRepository;
};

function matchesSearch(r: CustomerRelation, query: string): boolean {
  const haystack = [r.name, r.kana, r.phone, r.email, r.tags.join(" "), r.note]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function createEmptyForm(): CustomerRelationFormFields {
  return {
    name: "",
    relationType: "other",
    roleTitle: "",
    phone: "",
    email: "",
  };
}

function createEditForm(
  relation: CustomerRelation,
): CustomerRelationFormFields {
  return {
    name: relation.name,
    relationType: relation.relationType,
    roleTitle: relation.tags[0] ?? "",
    phone: relation.phone,
    email: relation.email,
  };
}

function pruneSelection(
  selectedIds: Record<string, boolean>,
  relations: CustomerRelation[],
): Record<string, boolean> {
  const validIds = new Set(relations.map((relation) => relation.id));
  return Object.fromEntries(
    Object.entries(selectedIds).filter(
      ([id, selected]) => selected && validIds.has(id),
    ),
  );
}

function upsertRelation(
  relations: CustomerRelation[],
  nextRelation: CustomerRelation,
): CustomerRelation[] {
  const nextIndex = relations.findIndex(
    (relation) => relation.id === nextRelation.id,
  );
  if (nextIndex === -1) return [nextRelation, ...relations];
  return relations.map((relation) =>
    relation.id === nextRelation.id ? nextRelation : relation,
  );
}

function mapLoadError(error: unknown): CustomerContactsModelErrorCode {
  if (
    error instanceof CustomerRepositoryError &&
    error.code === "UNAUTHORIZED"
  ) {
    return "unauthorized";
  }
  return "requestFailed";
}

function mapSaveError(error: unknown): CustomerContactsSaveErrorCode {
  if (
    error instanceof CustomerRepositoryError &&
    error.code === "VALIDATION_ERROR"
  ) {
    return "validation";
  }
  return "requestFailed";
}

function createRelationsLoader(input: {
  customerId: Ref<string>;
  repository: CustomerContactsRepository;
  relations: Ref<CustomerRelation[]>;
  loading: Ref<boolean>;
  errorCode: Ref<CustomerContactsModelErrorCode | null>;
  selectedIds: Ref<Record<string, boolean>>;
}) {
  let requestVersion = 0;

  return async (): Promise<void> => {
    const nextCustomerId = input.customerId.value.trim();
    if (!nextCustomerId) {
      input.relations.value = [];
      input.selectedIds.value = {};
      input.errorCode.value = null;
      input.loading.value = false;
      return;
    }

    const activeRequest = ++requestVersion;
    input.loading.value = true;
    input.errorCode.value = null;

    try {
      const nextRelations =
        await input.repository.listRelations(nextCustomerId);
      if (activeRequest !== requestVersion) return;
      input.relations.value = nextRelations;
      input.selectedIds.value = pruneSelection(
        input.selectedIds.value,
        nextRelations,
      );
    } catch (error) {
      if (activeRequest !== requestVersion) return;
      input.relations.value = [];
      input.selectedIds.value = {};
      input.errorCode.value = mapLoadError(error);
    } finally {
      if (activeRequest === requestVersion) input.loading.value = false;
    }
  };
}

function createContactsState() {
  return {
    searchQuery: ref(""),
    selectedIds: ref<Record<string, boolean>>({}),
    relations: ref<CustomerRelation[]>([]),
    loading: ref(false),
    errorCode: ref<CustomerContactsModelErrorCode | null>(null),
    isModalOpen: ref(false),
    editingRelationId: ref<string | null>(null),
    relationForm: ref<CustomerRelationFormFields>(createEmptyForm()),
    saving: ref(false),
    saveErrorCode: ref<CustomerContactsSaveErrorCode | null>(null),
  };
}

function createRelationsView(input: {
  searchQuery: Ref<string>;
  relations: Ref<CustomerRelation[]>;
}) {
  const allRelations = computed<CustomerRelation[]>(
    () => input.relations.value,
  );
  const filteredRelations = computed<CustomerRelation[]>(() => {
    const query = input.searchQuery.value.trim().toLowerCase();
    if (!query) return allRelations.value;
    return allRelations.value.filter((relation) =>
      matchesSearch(relation, query),
    );
  });
  return { allRelations, filteredRelations };
}

function createSelectionController(input: {
  searchQuery: Ref<string>;
  selectedIds: Ref<Record<string, boolean>>;
  allRelations: ComputedRef<CustomerRelation[]>;
  filteredRelations: ComputedRef<CustomerRelation[]>;
}) {
  const selectedRelations = computed(() =>
    input.allRelations.value.filter(
      (relation) => input.selectedIds.value[relation.id],
    ),
  );
  const selectedRelationIds = computed(() =>
    selectedRelations.value.map((relation) => relation.id),
  );
  const selectedCount = computed(
    () =>
      input.filteredRelations.value.filter((r) => input.selectedIds.value[r.id])
        .length,
  );
  const isAllSelected = computed(
    () =>
      input.filteredRelations.value.length > 0 &&
      selectedCount.value === input.filteredRelations.value.length,
  );
  const isIndeterminate = computed(
    () => selectedCount.value > 0 && !isAllSelected.value,
  );
  const hasSelection = computed(() => selectedRelationIds.value.length > 0);
  function toggleSelectAll(): void {
    input.selectedIds.value = Object.fromEntries(
      input.filteredRelations.value.map((relation) => [
        relation.id,
        !isAllSelected.value,
      ]),
    );
  }
  function toggleSelect(id: string): void {
    input.selectedIds.value = {
      ...input.selectedIds.value,
      [id]: !input.selectedIds.value[id],
    };
  }
  function setSearch(query: string): void {
    input.searchQuery.value = query;
  }

  return {
    selectedRelations,
    selectedRelationIds,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    hasSelection,
    toggleSelectAll,
    toggleSelect,
    setSearch,
  };
}

function resetModalDraft(input: {
  editingRelationId: Ref<string | null>;
  relationForm: Ref<CustomerRelationFormFields>;
  saveErrorCode: Ref<CustomerContactsSaveErrorCode | null>;
}): void {
  input.editingRelationId.value = null;
  input.relationForm.value = createEmptyForm();
  input.saveErrorCode.value = null;
}

function createModalVisibilityController(input: {
  isModalOpen: Ref<boolean>;
  editingRelationId: Ref<string | null>;
  relationForm: Ref<CustomerRelationFormFields>;
  saving: Ref<boolean>;
  saveErrorCode: Ref<CustomerContactsSaveErrorCode | null>;
}) {
  function closeModal(): void {
    input.isModalOpen.value = false;
    resetModalDraft(input);
    input.saving.value = false;
  }

  function openCreateModal(): void {
    resetModalDraft(input);
    input.isModalOpen.value = true;
  }

  function openEditModal(relation: CustomerRelation): void {
    input.editingRelationId.value = relation.id;
    input.relationForm.value = createEditForm(relation);
    input.saveErrorCode.value = null;
    input.isModalOpen.value = true;
  }

  return { closeModal, openCreateModal, openEditModal };
}

function createSubmitModalAction(input: {
  customerId: Ref<string>;
  repository: CustomerContactsRepository;
  relations: Ref<CustomerRelation[]>;
  selectedIds: Ref<Record<string, boolean>>;
  editingRelationId: Ref<string | null>;
  relationForm: Ref<CustomerRelationFormFields>;
  saving: Ref<boolean>;
  saveErrorCode: Ref<CustomerContactsSaveErrorCode | null>;
  canSubmit: ComputedRef<boolean>;
  closeModal: () => void;
}) {
  return async (): Promise<void> => {
    if (!input.canSubmit.value) {
      input.saveErrorCode.value = "validation";
      return;
    }
    const nextCustomerId = input.customerId.value.trim();
    if (!nextCustomerId) {
      input.saveErrorCode.value = "requestFailed";
      return;
    }

    input.saving.value = true;
    input.saveErrorCode.value = null;
    try {
      const payload = {
        customerId: nextCustomerId,
        ...input.relationForm.value,
      };
      const nextRelation = input.editingRelationId.value
        ? await input.repository.updateRelation(
            input.editingRelationId.value,
            payload,
          )
        : await input.repository.createRelation(payload);
      input.relations.value = upsertRelation(
        input.relations.value,
        nextRelation,
      );
      input.selectedIds.value = pruneSelection(
        input.selectedIds.value,
        input.relations.value,
      );
      input.closeModal();
    } catch (error) {
      input.saveErrorCode.value = mapSaveError(error);
    } finally {
      input.saving.value = false;
    }
  };
}

function createModalController(input: {
  customerId: Ref<string>;
  repository: CustomerContactsRepository;
  relations: Ref<CustomerRelation[]>;
  selectedIds: Ref<Record<string, boolean>>;
  isModalOpen: Ref<boolean>;
  editingRelationId: Ref<string | null>;
  relationForm: Ref<CustomerRelationFormFields>;
  saving: Ref<boolean>;
  saveErrorCode: Ref<CustomerContactsSaveErrorCode | null>;
}) {
  const isEditing = computed(() => input.editingRelationId.value !== null);
  const canSubmit = computed(
    () => input.relationForm.value.name.trim().length > 0,
  );
  const visibility = createModalVisibilityController({
    isModalOpen: input.isModalOpen,
    editingRelationId: input.editingRelationId,
    relationForm: input.relationForm,
    saving: input.saving,
    saveErrorCode: input.saveErrorCode,
  });
  const submitModal = createSubmitModalAction({
    customerId: input.customerId,
    repository: input.repository,
    relations: input.relations,
    selectedIds: input.selectedIds,
    editingRelationId: input.editingRelationId,
    relationForm: input.relationForm,
    saving: input.saving,
    saveErrorCode: input.saveErrorCode,
    canSubmit,
    closeModal: visibility.closeModal,
  });

  function updateFormField(
    field: keyof CustomerRelationFormFields,
    value: string,
  ): void {
    input.relationForm.value = { ...input.relationForm.value, [field]: value };
    input.saveErrorCode.value = null;
  }

  return {
    isEditing,
    canSubmit,
    updateFormField,
    closeModal: visibility.closeModal,
    openCreateModal: visibility.openCreateModal,
    openEditModal: visibility.openEditModal,
    submitModal,
  };
}

function bindContactsLifecycle(input: {
  customerId: Ref<string>;
  selectedIds: Ref<Record<string, boolean>>;
  closeModal: () => void;
  loadRelations: () => Promise<void>;
}): void {
  watch(
    input.customerId,
    () => {
      input.selectedIds.value = {};
      input.closeModal();
      void input.loadRelations();
    },
    { immediate: true },
  );
}

/**
 * 关联人 Tab 的状态编排：真实数据读取、搜索、选择与新增/编辑。
 *
 * @param input - 客户 ID 与关联人仓储依赖
 * @returns 关联人列表、搜索选择状态与弹窗读写能力
 */
export function useCustomerContactsModel(input: UseCustomerContactsModelInput) {
  return createCustomerContactsModel(input);
}

function createCustomerContactsModel(input: UseCustomerContactsModelInput) {
  const state = createContactsState();
  const { allRelations, filteredRelations } = createRelationsView({
    searchQuery: state.searchQuery,
    relations: state.relations,
  });
  const selection = createSelectionController({
    searchQuery: state.searchQuery,
    selectedIds: state.selectedIds,
    allRelations,
    filteredRelations,
  });
  const controllers = createContactsControllers(
    input,
    state,
    filteredRelations,
  );
  bindContactsLifecycle({
    customerId: input.customerId,
    selectedIds: state.selectedIds,
    closeModal: controllers.modal.closeModal,
    loadRelations: controllers.loadRelations,
  });

  return createContactsModelOutput(
    state,
    { allRelations, filteredRelations },
    selection,
    controllers,
  );
}

function createContactsControllers(
  input: UseCustomerContactsModelInput,
  state: ReturnType<typeof createContactsState>,
  filteredRelations: ComputedRef<CustomerRelation[]>,
) {
  const loadRelations = createRelationsLoader({
    customerId: input.customerId,
    repository: input.repository,
    relations: state.relations,
    loading: state.loading,
    errorCode: state.errorCode,
    selectedIds: state.selectedIds,
  });
  const modal = createModalController({
    customerId: input.customerId,
    repository: input.repository,
    relations: state.relations,
    selectedIds: state.selectedIds,
    isModalOpen: state.isModalOpen,
    editingRelationId: state.editingRelationId,
    relationForm: state.relationForm,
    saving: state.saving,
    saveErrorCode: state.saveErrorCode,
  });
  return { filteredRelations, loadRelations, modal };
}

function createContactsModelOutput(
  state: ReturnType<typeof createContactsState>,
  relationsView: ReturnType<typeof createRelationsView>,
  selection: ReturnType<typeof createSelectionController>,
  controllers: ReturnType<typeof createContactsControllers>,
) {
  return {
    searchQuery: state.searchQuery,
    selectedIds: state.selectedIds,
    allRelations: relationsView.allRelations,
    filteredRelations: relationsView.filteredRelations,
    selectedRelations: selection.selectedRelations,
    selectedRelationIds: selection.selectedRelationIds,
    selectedCount: selection.selectedCount,
    isAllSelected: selection.isAllSelected,
    isIndeterminate: selection.isIndeterminate,
    hasSelection: selection.hasSelection,
    loading: state.loading,
    errorCode: state.errorCode,
    isModalOpen: state.isModalOpen,
    relationForm: state.relationForm,
    isEditing: controllers.modal.isEditing,
    canSubmit: controllers.modal.canSubmit,
    saving: state.saving,
    saveErrorCode: state.saveErrorCode,
    toggleSelectAll: selection.toggleSelectAll,
    toggleSelect: selection.toggleSelect,
    setSearch: selection.setSearch,
    openCreateModal: controllers.modal.openCreateModal,
    openEditModal: controllers.modal.openEditModal,
    closeModal: controllers.modal.closeModal,
    updateFormField: controllers.modal.updateFormField,
    submitModal: controllers.modal.submitModal,
    retry: controllers.loadRelations,
  };
}
