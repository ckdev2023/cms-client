import { ref, watch, type Ref } from "vue";
import type { FormTemplate } from "../types-detail";
import type { CaseRepository } from "./CaseRepository";

/**
 * 文書模板列表的独立请求 composable。
 *
 * 根据 `caseType` 拉取模板列表，写入独立 ref（不回写 `detail.forms.templates`，
 * 避免 tab 数据 refetch 时被 adapter 覆盖为空数组）。
 *
 * @param deps 依赖注入
 * @param deps.repo - 案件仓储实例
 * @param deps.caseType - 响应式案件类型（从 detail 中派生）
 * @param deps.language - 文書模板的内容语言（ISO 639-1 alpha-2: `ja` / `zh` / `en`）；
 *   不是 UI locale（`zh-CN` / `ja-JP` / `en-US`），不可直接传入 vue-i18n 的 locale ref。
 *   省略时不做语言过滤，返回当前 caseType 下全部可用模板。
 * @returns `templates` ref 与手动 `refresh` 函数
 */
export function useCaseFormTemplates(deps: {
  repo: CaseRepository;
  caseType: Ref<string>;
  language?: Ref<string | undefined>;
}) {
  const templates = ref<FormTemplate[]>([]);
  const loading = ref(false);

  let generation = 0;

  async function fetchTemplates(): Promise<void> {
    const ct = deps.caseType.value;
    if (!ct) {
      templates.value = [];
      return;
    }

    const gen = ++generation;
    loading.value = true;
    try {
      const result = await deps.repo.listDocumentTemplates({
        caseType: ct,
        language: deps.language?.value,
      });
      if (gen !== generation) return;
      templates.value = result;
    } catch {
      if (gen !== generation) return;
      templates.value = [];
    } finally {
      if (gen === generation) loading.value = false;
    }
  }

  watch(
    () => deps.caseType.value,
    () => void fetchTemplates(),
    { immediate: true },
  );

  if (deps.language) {
    watch(
      () => deps.language!.value,
      () => void fetchTemplates(),
    );
  }

  return { templates, loading, refresh: fetchTemplates };
}
