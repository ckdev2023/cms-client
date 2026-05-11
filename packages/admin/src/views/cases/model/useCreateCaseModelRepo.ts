import type { CaseRepository } from "./CaseRepository";
import { createCaseRepository } from "./CaseRepository";

/**
 * 合并注入的 repo 与默认 checklist 预检实现。
 * @param depsRepo - 调用方可选覆盖的仓储；缺省则整份使用默认实现。
 * @returns 一定带有 `previewChecklistCount` 的案件仓储实例。
 */
export function resolveCaseCreateRepo(
  depsRepo: CaseRepository | undefined,
): CaseRepository {
  const fallbackRepo = createCaseRepository();
  const baseRepo = depsRepo ?? fallbackRepo;
  if (typeof baseRepo.previewChecklistCount === "function") {
    return baseRepo as CaseRepository;
  }
  return {
    ...baseRepo,
    previewChecklistCount:
      fallbackRepo.previewChecklistCount.bind(fallbackRepo),
  } as CaseRepository;
}
