import { Inject, Injectable, Optional } from "@nestjs/common";

import { CustomersService } from "../customers/customers.service";
import { CasesService } from "../cases/cases.service";
import { LeadsAdminService } from "../leads/leads.admin.service";
import { TasksService } from "../tasks/tasks.service";
import { DocumentItemsService } from "../document-items/documentItems.service";
import { ConversationsAdminService } from "../conversations/conversations.admin.service";
import type { RequestContext } from "../tenancy/requestContext";
import type { SearchHit, SearchHitType, SearchResponse } from "./search.types";
import { MAX_HITS_PER_TYPE, MAX_TOTAL_HITS } from "./search.types";

type SliceProvider = {
  type: SearchHitType;
  fetch: (ctx: RequestContext, q: string) => Promise<SearchHit[]>;
};

/**
 * 全局搜索聚合服务：调用各业务 service 的 list 方法，合并打分后返回。
 */
@Injectable()
export class SearchService {
  private readonly slices: readonly SliceProvider[];

  /**
   * 创建搜索聚合服务。
   *
   * @param customers - 客户服务。
   * @param cases - 案件服务。
   * @param leads - 线索服务。
   * @param tasks - 任务服务。
   * @param documents - 资料项服务。
   * @param conversations - 会話服务。
   */
  constructor(
    @Optional()
    @Inject(CustomersService)
    private readonly customers?: CustomersService,
    @Optional() @Inject(CasesService) private readonly cases?: CasesService,
    @Optional()
    @Inject(LeadsAdminService)
    private readonly leads?: LeadsAdminService,
    @Optional() @Inject(TasksService) private readonly tasks?: TasksService,
    @Optional()
    @Inject(DocumentItemsService)
    private readonly documents?: DocumentItemsService,
    @Optional()
    @Inject(ConversationsAdminService)
    private readonly conversations?: ConversationsAdminService,
  ) {
    this.slices = this.buildSlices();
  }

  /**
   * 执行全局聚合搜索，按类型分片取数后合并打分排序。
   *
   * @param ctx 请求上下文（租户隔离）。
   * @param rawQuery 原始搜索关键字。
   * @returns 搜索结果（含 truncated 标识）。
   */
  async search(ctx: RequestContext, rawQuery: string): Promise<SearchResponse> {
    const q = rawQuery.trim();
    if (q.length === 0) {
      return { query: q, hits: [], truncated: false };
    }

    const settled = await Promise.allSettled(
      this.slices.map((s) => s.fetch(ctx, q)),
    );

    const rawHits: SearchHit[] = [];
    for (const result of settled) {
      if (result.status === "fulfilled") {
        rawHits.push(...result.value);
      }
    }

    let anyTruncated = false;
    const byType = new Map<SearchHitType, SearchHit[]>();
    for (const hit of rawHits) {
      const list = byType.get(hit.type) ?? [];
      list.push(hit);
      byType.set(hit.type, list);
    }

    const capped: SearchHit[] = [];
    for (const [, list] of byType) {
      list.sort((a, b) => b.score - a.score);
      if (list.length > MAX_HITS_PER_TYPE) anyTruncated = true;
      capped.push(...list.slice(0, MAX_HITS_PER_TYPE));
    }

    capped.sort((a, b) => b.score - a.score);
    if (capped.length > MAX_TOTAL_HITS) anyTruncated = true;
    const hits =
      capped.length > MAX_TOTAL_HITS ? capped.slice(0, MAX_TOTAL_HITS) : capped;
    return { query: q, hits, truncated: anyTruncated };
  }

  private buildSlices(): SliceProvider[] {
    const slices: SliceProvider[] = [];
    if (this.customers) {
      const s = this.customers;
      slices.push({
        type: "customer",
        fetch: (ctx, q) => this.fetchCustomers(s, ctx, q),
      });
    }
    if (this.cases) {
      const s = this.cases;
      slices.push({
        type: "case",
        fetch: (ctx, q) => this.fetchCases(s, ctx, q),
      });
    }
    if (this.leads) {
      const s = this.leads;
      slices.push({
        type: "lead",
        fetch: (ctx, q) => this.fetchLeads(s, ctx, q),
      });
    }
    if (this.tasks) {
      const s = this.tasks;
      slices.push({
        type: "task",
        fetch: (ctx, q) => this.fetchTasks(s, ctx, q),
      });
    }
    if (this.documents) {
      const s = this.documents;
      slices.push({
        type: "document",
        fetch: (ctx, q) => this.fetchDocuments(s, ctx, q),
      });
    }
    if (this.conversations) {
      const s = this.conversations;
      slices.push({
        type: "conversation",
        fetch: (ctx, q) => this.fetchConversations(s, ctx, q),
      });
    }
    return slices;
  }

  private async fetchCustomers(
    s: CustomersService,
    ctx: RequestContext,
    q: string,
  ): Promise<SearchHit[]> {
    const { items } = await s.list(ctx, {
      keyword: q,
      limit: MAX_HITS_PER_TYPE,
    });
    return items.map((c) => ({
      type: "customer" as const,
      id: c.id,
      title: c.displayName || c.legalName || c.id,
      subtitle: c.customerNumber,
      href: `/customers/${c.id}`,
      score: scoreMatch(c.displayName || c.legalName || "", q),
    }));
  }

  private async fetchCases(
    s: CasesService,
    ctx: RequestContext,
    q: string,
  ): Promise<SearchHit[]> {
    const { items } = await s.listSummary(ctx, {
      limit: MAX_HITS_PER_TYPE * 4,
    });
    const qLower = q.toLowerCase();
    return items
      .filter((c) => {
        const blob = [c.caseName, c.caseNo, c.customerName]
          .filter((x): x is string => typeof x === "string" && x.length > 0)
          .join(" ")
          .toLowerCase();
        return blob.includes(qLower);
      })
      .map((c) => ({
        type: "case" as const,
        id: c.id,
        title: c.caseName ?? c.caseNo ?? c.id,
        subtitle: c.customerName,
        href: `/cases/${c.id}`,
        score: Math.max(
          scoreMatch(c.caseName ?? "", q),
          scoreMatch(c.caseNo ?? "", q),
          scoreMatch(c.customerName, q),
        ),
      }));
  }

  private async fetchLeads(
    s: LeadsAdminService,
    ctx: RequestContext,
    q: string,
  ): Promise<SearchHit[]> {
    const { items } = await s.list(ctx, {
      search: q,
      limit: MAX_HITS_PER_TYPE,
    });
    return items.map((l) => ({
      type: "lead" as const,
      id: l.id,
      title: l.name ?? l.leadNo ?? l.id,
      subtitle: l.email ?? l.phone ?? undefined,
      href: `/leads/${l.id}`,
      score: scoreMatch(l.name ?? l.leadNo ?? "", q),
    }));
  }

  private async fetchTasks(
    s: TasksService,
    ctx: RequestContext,
    q: string,
  ): Promise<SearchHit[]> {
    const { items } = await s.list(ctx, { limit: MAX_HITS_PER_TYPE * 4 });
    const qLower = q.toLowerCase();
    return items
      .filter((t) => t.title.toLowerCase().includes(qLower))
      .map((t) => ({
        type: "task" as const,
        id: t.id,
        title: t.title,
        subtitle: t.status,
        href: `/tasks/${t.id}`,
        score: scoreMatch(t.title, q),
      }));
  }

  private async fetchDocuments(
    s: DocumentItemsService,
    ctx: RequestContext,
    q: string,
  ): Promise<SearchHit[]> {
    const { items } = await s.list(ctx, { limit: MAX_HITS_PER_TYPE * 4 });
    const qLower = q.toLowerCase();
    return items
      .filter((d) => d.name.toLowerCase().includes(qLower))
      .map((d) => ({
        type: "document" as const,
        id: d.id,
        title: d.name,
        subtitle: d.status,
        href: `/documents/${d.id}`,
        score: scoreMatch(d.name, q),
      }));
  }

  private async fetchConversations(
    s: ConversationsAdminService,
    ctx: RequestContext,
    q: string,
  ): Promise<SearchHit[]> {
    const { items } = await s.list(ctx, {
      search: q,
      limit: MAX_HITS_PER_TYPE,
    });
    return items.map((c) => ({
      type: "conversation" as const,
      id: c.id,
      title: `Conversation ${c.id.slice(0, 8)}`,
      subtitle: c.channel,
      href: `/conversations/${c.id}`,
      score: 1,
    }));
  }
}

/**
 * 简易文本匹配打分：startsWith +2, includes +1, 否则 0。
 *
 * @param title 待匹配文本。
 * @param query 搜索关键字。
 * @returns 匹配分数。
 */
export function scoreMatch(title: string, query: string): number {
  const tLower = title.toLowerCase();
  const qLower = query.toLowerCase();
  if (tLower.startsWith(qLower)) return 2;
  if (tLower.includes(qLower)) return 1;
  return 0;
}
