import type { SearchHit } from "../shared/api/searchRepository";
import { SAMPLE_CUSTOMERS } from "../views/customers/fixtures";
import { SAMPLE_CASE_LIST } from "../views/cases/__fixtures__/fixtures";
import { LEAD_SAMPLES } from "../views/leads/fixtures";
import { SAMPLE_DOCUMENTS } from "../views/documents/fixtures";
import { SAMPLE_CONVERSATION_LIST } from "../views/conversations/fixtures";
/**
 * 从各 feature 的 fixture 数据聚合搜索命中项，仅供 searchRepository 的单测使用。
 *
 * 原名 `searchFixtures.ts`，挂在生产路径下但只有测试消费；它跨 5 个模块直引各自的
 * fixtures，是 `cases-internals-are-module-private` 唯一的常驻 warn。B6 收口时改名为
 * `.test-support.ts`（仓库既有约定），归入规则的 test-support 豁免，warn 随之清零。
 *
 * 旧注释称「用于测试与本地 fallback」，实测无任何生产消费方——searchRepository.ts
 * 并不 import 本模块，fallback 说法已过期，一并更正。
 *
 * @returns 聚合后的 SearchHit 列表
 */
export function buildDefaultSearchHits(): SearchHit[] {
  const hits: SearchHit[] = [];

  for (const c of SAMPLE_CUSTOMERS) {
    hits.push({
      type: "customer",
      id: c.id,
      title: c.displayName,
      subtitle: c.customerNumber,
      href: `/customers/${c.id}`,
    });
  }

  for (const c of SAMPLE_CASE_LIST) {
    hits.push({
      type: "case",
      id: c.id,
      title: c.name,
      subtitle: c.applicant,
      href: `/cases/${c.id}`,
    });
  }

  for (const l of LEAD_SAMPLES) {
    hits.push({
      type: "lead",
      id: l.id,
      title: l.name,
      subtitle: l.businessTypeLabel,
      href: `/leads/${l.id}`,
    });
  }

  for (const d of SAMPLE_DOCUMENTS) {
    hits.push({
      type: "document",
      id: d.id,
      title: d.name,
      subtitle: d.caseName,
      href: `/documents/${d.id}`,
    });
  }

  for (const conv of SAMPLE_CONVERSATION_LIST) {
    hits.push({
      type: "conversation",
      id: conv.id,
      title: conv.appUserName,
      subtitle: conv.lastMessagePreview,
      href: `/conversations/${conv.id}`,
    });
  }

  return hits;
}
