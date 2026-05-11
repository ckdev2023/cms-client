import { getProviderLabelKey } from "../../documents/constants";
import { resolveProvider } from "../../documents/model/DocumentAdapter";
import type { DocumentProviderType } from "../../documents/types";
import type { ChecklistPreviewLineItem } from "./checklistPreview.contract";

const PROVIDER_BUCKET_ORDER: Record<string, number> = {
  main_applicant: 10,
  dependent_guarantor: 20,
  employer_org: 30,
  office_internal: 40,
};

/** 与服务端 blueprint 遍历顺序一致；按首次出现的提供方分段。 */
export type ChecklistPreviewSection = {
  /** 资料提供方（与 `DocumentAdapter.resolveProvider` 一致）。 */
  provider: DocumentProviderType;
  /** 分组标题（已本地化）。 */
  title: string;
  /** 该分组下的资料条目。 */
  items: Array<{
    code: string;
    name: string;
    requiredFlag: boolean;
  }>;
};

/**
 * 将 checklist-preview `items` 规范为 Step2 「资料清单预览」分段（与详情资料 Tab `resolveProvider` 同源）。
 *
 * @param lines 服务端返回的 checklist 条目数组（`GET checklist-preview` 的 `items`）
 * @param caseTypeCode 建案草稿中的案件类型代号（与发往 preview 接口的 caseTypeCode 一致）
 * @param t i18n 的 `t` 函数，用于提供方分组标题本地化
 * @returns 有序分段；段内条目顺序与 API 数组顺序一致
 */
export function buildChecklistPreviewSections(
  lines: ChecklistPreviewLineItem[],
  caseTypeCode: string | undefined,
  t: (key: string) => string,
): ChecklistPreviewSection[] {
  const sections: ChecklistPreviewSection[] = [];
  const indexByProvider = new Map<DocumentProviderType, number>();
  const ct = caseTypeCode?.trim() || undefined;

  for (const line of lines) {
    const provider = resolveProvider(
      line.providedByRole,
      line.ownerSide ?? "applicant",
      line.code,
    );
    let idx = indexByProvider.get(provider);
    if (idx === undefined) {
      idx = sections.length;
      indexByProvider.set(provider, idx);
      const titleKey = getProviderLabelKey(provider, { caseTypeCode: ct });
      sections.push({
        provider,
        title: t(titleKey),
        items: [],
      });
    }
    sections[idx]!.items.push({
      code: line.code || line.name || `idx-${sections[idx]!.items.length}`,
      name: line.name || line.code || "—",
      requiredFlag: line.requiredFlag === true,
    });
  }

  sections.sort((a, b) => {
    const pa = PROVIDER_BUCKET_ORDER[a.provider] ?? Number.MAX_SAFE_INTEGER;
    const pb = PROVIDER_BUCKET_ORDER[b.provider] ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    return a.provider.localeCompare(b.provider);
  });

  return sections;
}
