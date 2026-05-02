import type { SearchHit } from "../shared/api/searchRepository";
import { SAMPLE_CUSTOMERS } from "../views/customers/fixtures";
import { SAMPLE_CASE_LIST } from "../views/cases/fixtures";
import { LEAD_SAMPLES } from "../views/leads/fixtures";
import { SAMPLE_DOCUMENTS } from "../views/documents/fixtures";
import { SAMPLE_CONVERSATION_LIST } from "../views/conversations/fixtures";
/**
 * 从各 feature 的 fixture 数据聚合搜索命中项，用于测试与本地 fallback。
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
