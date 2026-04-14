import { type Ref, ref, computed } from "vue";
import type { RegisterPaymentFormFields, BillingPlanNode } from "../types";

/**
 * 空白回款表单。
 *
 * @returns 默认表单字段
 */
function emptyForm(): RegisterPaymentFormFields {
  return { amount: "", date: "", billingPlanId: "", receipt: "", note: "" };
}

/**
 * 过滤未结清节点；仅剩一个时返回自动选中 ID。
 *
 * @param nodes - 收费计划节点列表
 * @returns 未结清节点与自动选中 ID
 */
function resolveNodes(nodes?: BillingPlanNode[]) {
  const unpaid = (nodes ?? []).filter((n) => n.status !== "paid");
  return { unpaid, autoId: unpaid.length === 1 ? unpaid[0].id : "" };
}

/**
 * 构建回款表单校验计算属性。
 *
 * @param fields - 表单字段 ref
 * @param availableNodes - 可用节点 ref
 * @returns 校验相关计算属性
 */
function buildValidation(
  fields: Ref<RegisterPaymentFormFields>,
  availableNodes: Ref<BillingPlanNode[]>,
) {
  const parsedAmount = computed(() => {
    const n = parseFloat(fields.value.amount);
    return isNaN(n) ? 0 : n;
  });
  const selectedNode = computed(
    () =>
      availableNodes.value.find((n) => n.id === fields.value.billingPlanId) ??
      null,
  );
  const amountExceedsNode = computed(
    () =>
      !!selectedNode.value &&
      parsedAmount.value > 0 &&
      parsedAmount.value > selectedNode.value.amount,
  );
  const needsNodeSelection = computed(
    () => availableNodes.value.length > 1 && !fields.value.billingPlanId,
  );
  const canSubmit = computed(
    () =>
      parsedAmount.value > 0 &&
      fields.value.date !== "" &&
      !needsNodeSelection.value,
  );
  return {
    parsedAmount,
    selectedNode,
    amountExceedsNode,
    needsNodeSelection,
    canSubmit,
  };
}

/**
 * 登记回款弹窗状态管理。
 *
 * 提供默认节点选择、金额超限提示（软警告）、多节点未选择阻断、提交可用态。
 *
 * @returns 弹窗开关、表单状态、校验计算属性与操作方法
 */
export function usePaymentModal() {
  const isOpen = ref(false);
  const fields = ref(emptyForm());
  const availableNodes = ref<BillingPlanNode[]>([]);
  const validation = buildValidation(fields, availableNodes);

  /**
   * 打开弹窗并初始化节点列表。
   *
   * @param nodes - 可选的收费计划节点
   */
  function open(nodes?: BillingPlanNode[]) {
    const { unpaid, autoId } = resolveNodes(nodes);
    availableNodes.value = unpaid;
    if (autoId) fields.value.billingPlanId = autoId;
    isOpen.value = true;
  }
  function close() {
    isOpen.value = false;
    resetForm();
  }
  function resetForm() {
    fields.value = emptyForm();
    availableNodes.value = [];
  }

  return {
    isOpen,
    fields,
    availableNodes,
    ...validation,
    open,
    close,
    resetForm,
  };
}
