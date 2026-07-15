/**
 * 资料 Tab 的分组视图 —— 自 `useCaseDocumentsTab.ts` 抽出的叶子模块。
 *
 * 抽出动因（B1）：CaseRepository 迁入 api/ 后 import 路径变长，prettier 将其
 * 折成多行，宿主文件从 499 行涨到 502，越过 max-lines 上限 500。按仓库既有
 * 纪律，超限一律抽函数，不得用 eslint-disable 豁免（该豁免正是架构报告点名
 * 的技术债）。分组/排序本就是独立关注点，与同目录 `caseDocumentsChecklistSort`
 * 同源，抽出后宿主只留编排。
 */
import { computed, type Ref } from "vue";
import type { useI18n } from "vue-i18n";
import type {
  DocumentGroup,
  DocumentItem,
} from "../detail/tabs/documents/types";
import type { DocumentListItem } from "../../documents/types";
import { getProviderLabelKey } from "../../documents/constants";
import type { useDocumentListModel } from "../../documents/model/useDocumentListModel";
import { toCaseDetailItems } from "../../documents/model/DocumentDetailItemAdapter";
import { compareDocumentListItemsForChecklistStableOrder } from "./caseDocumentsChecklistSort";

type ListDetailPair = { list: DocumentListItem; detail: DocumentItem };

type T = ReturnType<typeof useI18n>["t"];

/**
 * 资料分组顺序，与 `CaseAdapterDetailAggregate` 的 `providerProgress` 展示顺序
 * （及概览「按提供方完成率」）一致：主申请人 → 扶养担保侧 → 会社侧 → 事务所内部。
 * 未列出的 provider 排在尾部，仍按字母序兜底。
 */
const PROVIDER_GROUP_ORDER: Record<string, number> = {
  main_applicant: 10,
  dependent_guarantor: 20,
  employer_org: 30,
  office_internal: 40,
};

/**
 * 构建资料明细项与按提供方分组的视图。
 *
 * @param listModel - 资料列表模型
 * @param t - i18n 翻译函数
 * @param caseTypeCode - 案件类型码，决定 provider 标签口径
 * @returns detailItems（明细项）与 documentGroups（按提供方分组）
 */
export function buildGrouping(
  listModel: ReturnType<typeof useDocumentListModel>,
  t: T,
  caseTypeCode: Ref<string | undefined>,
) {
  const detailItems = computed(() => toCaseDetailItems(listModel.items.value));
  const documentGroups = computed<DocumentGroup[]>(() => {
    const grouped = new Map<string, ListDetailPair[]>();
    const items = listModel.items.value;
    const details = detailItems.value;
    for (let i = 0; i < items.length; i++) {
      const key = items[i].provider;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push({ list: items[i], detail: details[i] });
    }
    const entries = Array.from(grouped.entries());
    entries.sort(([a], [b]) => {
      const pa = PROVIDER_GROUP_ORDER[a] ?? Number.MAX_SAFE_INTEGER;
      const pb = PROVIDER_GROUP_ORDER[b] ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b);
    });
    const code = caseTypeCode.value;
    return entries.map(([p, pairs]) => {
      const sorted = [...pairs].sort((x, y) =>
        compareDocumentListItemsForChecklistStableOrder(x.list, y.list),
      );
      return {
        group: t(getProviderLabelKey(p, { caseTypeCode: code })),
        count: `${sorted.length} 件`,
        items: sorted.map((pair) => pair.detail),
      };
    });
  });
  return { detailItems, documentGroups };
}
