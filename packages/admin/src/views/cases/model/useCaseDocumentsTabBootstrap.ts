import { ref, type Ref } from "vue";
import type { UseToastReturn } from "../../../shared/model/useToast";
import type { CaseRepository } from "./CaseRepository";

type T = (key: string, params?: Record<string, unknown>) => string;

/**
 * 从模板补生成资料清单的处理器。
 *
 * @param caseId - 响应式案件 ID
 * @param caseRepo - CaseRepository 实例
 * @param toast - toast 通知
 * @param t - i18n 翻译函数
 * @param refresh - 成功后刷新列表回调
 * @returns bootstrapping 状态与 handleBootstrapChecklist 函数
 */
export function buildBootstrapHandler(
  caseId: Ref<string>,
  caseRepo: CaseRepository,
  toast: UseToastReturn,
  t: T,
  refresh: () => void,
) {
  const bootstrapping = ref(false);

  async function handleBootstrapChecklist() {
    if (bootstrapping.value) return;
    bootstrapping.value = true;
    try {
      const result = await caseRepo.bootstrapChecklist(caseId.value);
      const count =
        result && typeof result === "object" && "count" in result
          ? ((result as { count?: number }).count ?? 0)
          : 0;
      toast.add({
        title: t(
          "cases.detail.documents.empty.templateMissing.bootstrapSuccess",
          { count },
        ),
      });
      refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.add({
        title: t("cases.detail.documents.empty.templateMissing.bootstrapError"),
        description: msg,
        tone: "error",
      });
    } finally {
      bootstrapping.value = false;
    }
  }

  return { bootstrapping, handleBootstrapChecklist };
}
