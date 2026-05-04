var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
import { Inject, Injectable, Optional } from "@nestjs/common";
import { CustomersService } from "../customers/customers.service";
import { CasesService } from "../cases/cases.service";
import { LeadsAdminService } from "../leads/leads.admin.service";
import { TasksService } from "../tasks/tasks.service";
import { DocumentItemsService } from "../document-items/documentItems.service";
import { ConversationsAdminService } from "../conversations/conversations.admin.service";
import { MAX_HITS_PER_TYPE, MAX_TOTAL_HITS } from "./search.types";
/**
 * 全局搜索聚合服务：调用各业务 service 的 list 方法，合并打分后返回。
 */
let SearchService = class SearchService {
  customers;
  cases;
  leads;
  tasks;
  documents;
  conversations;
  slices;
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
  constructor(customers, cases, leads, tasks, documents, conversations) {
    this.customers = customers;
    this.cases = cases;
    this.leads = leads;
    this.tasks = tasks;
    this.documents = documents;
    this.conversations = conversations;
    this.slices = this.buildSlices();
  }
  /**
   * 执行全局聚合搜索，按类型分片取数后合并打分排序。
   *
   * @param ctx 请求上下文（租户隔离）。
   * @param rawQuery 原始搜索关键字。
   * @returns 搜索结果（含 truncated 标识）。
   */
  async search(ctx, rawQuery) {
    const q = rawQuery.trim();
    if (q.length === 0) {
      return { query: q, hits: [], truncated: false };
    }
    const settled = await Promise.allSettled(
      this.slices.map((s) => s.fetch(ctx, q)),
    );
    const rawHits = [];
    for (const result of settled) {
      if (result.status === "fulfilled") {
        rawHits.push(...result.value);
      }
    }
    let anyTruncated = false;
    const byType = new Map();
    for (const hit of rawHits) {
      const list = byType.get(hit.type) ?? [];
      list.push(hit);
      byType.set(hit.type, list);
    }
    const capped = [];
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
  buildSlices() {
    const slices = [];
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
  async fetchCustomers(s, ctx, q) {
    const { items } = await s.list(ctx, {
      keyword: q,
      limit: MAX_HITS_PER_TYPE,
    });
    return items.map((c) => ({
      type: "customer",
      id: c.id,
      title: c.displayName || c.legalName || c.id,
      subtitle: c.customerNumber,
      href: `/customers/${c.id}`,
      score: scoreMatch(c.displayName || c.legalName || "", q),
    }));
  }
  async fetchCases(s, ctx, q) {
    const { items } = await s.listSummary(ctx, {
      limit: MAX_HITS_PER_TYPE * 4,
    });
    const qLower = q.toLowerCase();
    return items
      .filter((c) =>
        (c.caseName ?? c.caseNo ?? "").toLowerCase().includes(qLower),
      )
      .map((c) => ({
        type: "case",
        id: c.id,
        title: c.caseName ?? c.caseNo ?? c.id,
        subtitle: c.customerName,
        href: `/cases/${c.id}`,
        score: scoreMatch(c.caseName ?? c.caseNo ?? "", q),
      }));
  }
  async fetchLeads(s, ctx, q) {
    const { items } = await s.list(ctx, {
      search: q,
      limit: MAX_HITS_PER_TYPE,
    });
    return items.map((l) => ({
      type: "lead",
      id: l.id,
      title: l.name ?? l.leadNo ?? l.id,
      subtitle: l.email ?? l.phone ?? undefined,
      href: `/leads/${l.id}`,
      score: scoreMatch(l.name ?? l.leadNo ?? "", q),
    }));
  }
  async fetchTasks(s, ctx, q) {
    const { items } = await s.list(ctx, { limit: MAX_HITS_PER_TYPE * 4 });
    const qLower = q.toLowerCase();
    return items
      .filter((t) => t.title.toLowerCase().includes(qLower))
      .map((t) => ({
        type: "task",
        id: t.id,
        title: t.title,
        subtitle: t.status,
        href: `/tasks/${t.id}`,
        score: scoreMatch(t.title, q),
      }));
  }
  async fetchDocuments(s, ctx, q) {
    const { items } = await s.list(ctx, { limit: MAX_HITS_PER_TYPE * 4 });
    const qLower = q.toLowerCase();
    return items
      .filter((d) => d.name.toLowerCase().includes(qLower))
      .map((d) => ({
        type: "document",
        id: d.id,
        title: d.name,
        subtitle: d.status,
        href: `/documents/${d.id}`,
        score: scoreMatch(d.name, q),
      }));
  }
  async fetchConversations(s, ctx, q) {
    const { items } = await s.list(ctx, {
      search: q,
      limit: MAX_HITS_PER_TYPE,
    });
    return items.map((c) => ({
      type: "conversation",
      id: c.id,
      title: `Conversation ${c.id.slice(0, 8)}`,
      subtitle: c.channel,
      href: `/conversations/${c.id}`,
      score: 1,
    }));
  }
};
SearchService = __decorate(
  [
    Injectable(),
    __param(0, Optional()),
    __param(0, Inject(CustomersService)),
    __param(1, Optional()),
    __param(1, Inject(CasesService)),
    __param(2, Optional()),
    __param(2, Inject(LeadsAdminService)),
    __param(3, Optional()),
    __param(3, Inject(TasksService)),
    __param(4, Optional()),
    __param(4, Inject(DocumentItemsService)),
    __param(5, Optional()),
    __param(5, Inject(ConversationsAdminService)),
    __metadata("design:paramtypes", [
      CustomersService,
      CasesService,
      LeadsAdminService,
      TasksService,
      DocumentItemsService,
      ConversationsAdminService,
    ]),
  ],
  SearchService,
);
export { SearchService };
/**
 * 简易文本匹配打分：startsWith +2, includes +1, 否则 0。
 *
 * @param title 待匹配文本。
 * @param query 搜索关键字。
 * @returns 匹配分数。
 */
export function scoreMatch(title, query) {
  const tLower = title.toLowerCase();
  const qLower = query.toLowerCase();
  if (tLower.startsWith(qLower)) return 2;
  if (tLower.includes(qLower)) return 1;
  return 0;
}
//# sourceMappingURL=search.service.js.map
