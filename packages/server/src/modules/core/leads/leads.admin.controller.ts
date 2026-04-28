import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators";
import type { RequestContext } from "../tenancy/requestContext";
import { LeadsAdminService, type LeadListScope } from "./leads.admin.service";

type HttpRequest = { requestContext?: RequestContext };

type ListLeadsQuery = {
  scope?: unknown;
  status?: unknown;
  ownerUserId?: unknown;
  groupId?: unknown;
  businessType?: unknown;
  search?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
  page?: unknown;
  limit?: unknown;
};
type UpdateLeadBody = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  sourceChannel?: unknown;
  referrer?: unknown;
  intendedCaseType?: unknown;
  groupId?: unknown;
  ownerUserId?: unknown;
  nextAction?: unknown;
  nextFollowUpAt?: unknown;
  quoteAmount?: unknown;
  note?: unknown;
};
type StatusBody = { status?: unknown; lostReason?: unknown };
type FollowupBody = {
  channel?: unknown;
  summary?: unknown;
  conclusion?: unknown;
  nextAction?: unknown;
  nextFollowUpAt?: unknown;
};
type BulkAssignBody = { leadIds?: unknown; ownerUserId?: unknown };
type BulkFollowupBody = {
  leadIds?: unknown;
  channel?: unknown;
  summary?: unknown;
};
type BulkStatusBody = {
  leadIds?: unknown;
  status?: unknown;
  lostReason?: unknown;
};
type BulkTagsBody = { leadIds?: unknown; tags?: unknown };
type BulkExportBody = { leadIds?: unknown };
type DedupQuery = { phone?: unknown; email?: unknown };

// ── Parsers ──

function requireCtx(req: HttpRequest): RequestContext {
  const ctx = req.requestContext;
  if (!ctx) throw new UnauthorizedException("Missing request context");
  return ctx;
}

function parsePage(v: unknown): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid page");
  const i = Math.floor(n);
  if (i < 1) throw new BadRequestException("Invalid page");
  return i;
}

function parseLimit(v: unknown): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}

function optStr(v: unknown, f: string): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestException(`Invalid ${f}`);
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function reqStr(v: unknown, f: string): string {
  const r = optStr(v, f);
  if (!r) throw new BadRequestException(`${f} is required`);
  return r;
}

function optNum(v: unknown, f: string): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException(`Invalid ${f}`);
  return n;
}

function parseScope(v: unknown): LeadListScope | undefined {
  if (v === undefined) return undefined;
  if (v === "mine" || v === "group" || v === "all") return v;
  throw new BadRequestException("Invalid scope");
}

function strArr(v: unknown, f: string): string[] {
  if (!Array.isArray(v)) throw new BadRequestException(`Invalid ${f}`);
  const items = v.map((item) => {
    if (typeof item !== "string")
      throw new BadRequestException(`Invalid ${f} item`);
    const t = item.trim();
    if (t.length === 0) throw new BadRequestException(`Invalid ${f} item`);
    return t;
  });
  if (items.length === 0)
    throw new BadRequestException(`${f} must contain at least one id`);
  return [...new Set(items)];
}

// ── Controller ──

/**
 * Admin Lead 管理コントローラ。
 */
@Controller("admin/leads")
export class LeadsAdminController {
  /**
   * コンストラクタ。
   * @param svc Lead 管理サービス
   */
  constructor(
    @Inject(LeadsAdminService) private readonly svc: LeadsAdminService,
  ) {}

  /**
   * Lead 一覧を取得する。
   * @param req HTTP リクエスト
   * @param query 検索パラメータ
   * @returns Lead 一覧と総件数
   */
  @RequireRoles("staff")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListLeadsQuery) {
    const ctx = requireCtx(req);
    return this.svc.list(ctx, {
      scope: parseScope(query.scope),
      status: optStr(query.status, "status"),
      ownerUserId: optStr(query.ownerUserId, "ownerUserId"),
      groupId: optStr(query.groupId, "groupId"),
      businessType: optStr(query.businessType, "businessType"),
      search: optStr(query.search, "search"),
      dateFrom: optStr(query.dateFrom, "dateFrom"),
      dateTo: optStr(query.dateTo, "dateTo"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * 電話番号/メールで重複候補を検索する（org_id 強制）。
   * @param req HTTP リクエスト
   * @param query 検索パラメータ
   * @returns 重複候補の Lead と Customer
   */
  @RequireRoles("staff")
  @Get("dedup")
  async dedup(@Req() req: HttpRequest, @Query() query: DedupQuery) {
    return this.svc.dedup(requireCtx(req), {
      phone: optStr(query.phone, "phone"),
      email: optStr(query.email, "email"),
    });
  }

  /**
   * Lead 詳細を取得する。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @returns Lead 詳細集約
   */
  @RequireRoles("staff")
  @Get(":id")
  async getDetail(@Req() req: HttpRequest, @Param("id") id: string) {
    return this.svc.getDetail(requireCtx(req), id);
  }

  /**
   * Lead の業務フィールドを更新する。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @param body 更新リクエストボディ
   * @returns 更新後の Lead
   */
  @RequireRoles("staff")
  @Patch(":id")
  async update(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: UpdateLeadBody,
  ) {
    return this.svc.update(requireCtx(req), id, {
      name: optStr(body.name, "name"),
      phone: optStr(body.phone, "phone"),
      email: optStr(body.email, "email"),
      sourceChannel: optStr(body.sourceChannel, "sourceChannel"),
      referrer: optStr(body.referrer, "referrer"),
      intendedCaseType: optStr(body.intendedCaseType, "intendedCaseType"),
      groupId: optStr(body.groupId, "groupId"),
      ownerUserId: optStr(body.ownerUserId, "ownerUserId"),
      nextAction: optStr(body.nextAction, "nextAction"),
      nextFollowUpAt: optStr(body.nextFollowUpAt, "nextFollowUpAt"),
      quoteAmount: optNum(body.quoteAmount, "quoteAmount"),
      note: optStr(body.note, "note"),
    });
  }

  /**
   * Lead ステータスを遷移させる。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @param body ステータス遷移リクエストボディ
   * @returns 更新後の Lead
   */
  @RequireRoles("staff")
  @Patch(":id/status")
  async transitionStatus(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: StatusBody,
  ) {
    return this.svc.transitionStatus(requireCtx(req), id, {
      status: reqStr(body.status, "status"),
      lostReason: optStr(body.lostReason, "lostReason"),
    });
  }

  /**
   * Lead にフォローアップを追加する。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @param body フォローアップリクエストボディ
   * @returns 作成されたフォローアップ
   */
  @RequireRoles("staff")
  @Post(":id/followups")
  async addFollowup(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: FollowupBody,
  ) {
    return this.svc.addFollowup(requireCtx(req), id, {
      channel: reqStr(body.channel, "channel"),
      summary: optStr(body.summary, "summary"),
      conclusion: optStr(body.conclusion, "conclusion"),
      nextAction: optStr(body.nextAction, "nextAction"),
      nextFollowUpAt: optStr(body.nextFollowUpAt, "nextFollowUpAt"),
    });
  }

  /**
   * Lead のフォローアップ一覧を取得する。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @returns フォローアップ一覧
   */
  @RequireRoles("staff")
  @Get(":id/followups")
  async listFollowups(@Req() req: HttpRequest, @Param("id") id: string) {
    return this.svc.listFollowups(requireCtx(req), id);
  }

  /**
   * Lead のログ一覧を取得する。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @returns ログ一覧
   */
  @RequireRoles("staff")
  @Get(":id/logs")
  async listLogs(@Req() req: HttpRequest, @Param("id") id: string) {
    return this.svc.listLogs(requireCtx(req), id);
  }

  /**
   * 一括担当者変更を実行する。
   * @param req HTTP リクエスト
   * @param body 一括担当者変更リクエストボディ
   * @returns 更新件数
   */
  @RequireRoles("staff")
  @Post("bulk/assign")
  async bulkAssign(@Req() req: HttpRequest, @Body() body: BulkAssignBody) {
    return this.svc.bulkAssign(requireCtx(req), {
      leadIds: strArr(body.leadIds, "leadIds"),
      ownerUserId: reqStr(body.ownerUserId, "ownerUserId"),
    });
  }

  /**
   * 一括フォローアップ追加を実行する。
   * @param req HTTP リクエスト
   * @param body 一括フォローアップリクエストボディ
   * @returns 更新件数
   */
  @RequireRoles("staff")
  @Post("bulk/followup")
  async bulkFollowup(@Req() req: HttpRequest, @Body() body: BulkFollowupBody) {
    return this.svc.bulkFollowup(requireCtx(req), {
      leadIds: strArr(body.leadIds, "leadIds"),
      channel: reqStr(body.channel, "channel"),
      summary: optStr(body.summary, "summary"),
    });
  }

  /**
   * 一括ステータス変更を実行する。
   * @param req HTTP リクエスト
   * @param body 一括ステータス変更リクエストボディ
   * @returns 更新件数とエラー一覧
   */
  @RequireRoles("staff")
  @Post("bulk/status")
  async bulkStatus(@Req() req: HttpRequest, @Body() body: BulkStatusBody) {
    return this.svc.bulkStatus(requireCtx(req), {
      leadIds: strArr(body.leadIds, "leadIds"),
      status: reqStr(body.status, "status"),
      lostReason: optStr(body.lostReason, "lostReason"),
    });
  }

  /**
   * 一括タグ更新を実行する。
   * @param req HTTP リクエスト
   * @param body 一括タグリクエストボディ
   * @returns 更新件数
   */
  @RequireRoles("staff")
  @Post("bulk/tags")
  async bulkTags(@Req() req: HttpRequest, @Body() body: BulkTagsBody) {
    return this.svc.bulkTags(requireCtx(req), {
      leadIds: strArr(body.leadIds, "leadIds"),
      tags: strArr(body.tags, "tags"),
    });
  }

  /**
   * 一括エクスポート用データを取得する。
   * @param req HTTP リクエスト
   * @param body エクスポートリクエストボディ
   * @returns Lead 一覧
   */
  @RequireRoles("staff")
  @Post("bulk/export")
  async bulkExport(@Req() req: HttpRequest, @Body() body: BulkExportBody) {
    return this.svc.bulkExport(
      requireCtx(req),
      strArr(body.leadIds, "leadIds"),
    );
  }
}
