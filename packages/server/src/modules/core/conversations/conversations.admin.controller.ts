import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators";
import type { RequestContext } from "../tenancy/requestContext";
import { ConversationsAdminService } from "./conversations.admin.service";

type HttpRequest = { requestContext?: RequestContext };

type ListConversationsQuery = {
  status?: unknown;
  ownerUserId?: unknown;
  leadId?: unknown;
  customerId?: unknown;
  caseId?: unknown;
  appUserId?: unknown;
  unreadOnly?: unknown;
  search?: unknown;
  page?: unknown;
  limit?: unknown;
};

type AssignBody = { ownerUserId?: unknown };

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

function parseBool(v: unknown): boolean | undefined {
  if (v === undefined) return undefined;
  if (v === "true" || v === true || v === "1") return true;
  if (v === "false" || v === false || v === "0") return false;
  return undefined;
}

/**
 * Admin 会話管理コントローラ。
 */
@Controller("admin/conversations")
export class ConversationsAdminController {
  /**
   * コンストラクタ。
   * @param svc 会話管理サービス
   */
  constructor(
    @Inject(ConversationsAdminService)
    private readonly svc: ConversationsAdminService,
  ) {}

  /**
   * 会話一覧を取得する。
   * @param req HTTP リクエスト
   * @param query 検索パラメータ
   * @returns 会話一覧と総件数
   */
  @RequireRoles("staff")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListConversationsQuery) {
    const ctx = requireCtx(req);
    return this.svc.list(ctx, {
      status: optStr(query.status, "status"),
      ownerUserId: optStr(query.ownerUserId, "ownerUserId"),
      leadId: optStr(query.leadId, "leadId"),
      customerId: optStr(query.customerId, "customerId"),
      caseId: optStr(query.caseId, "caseId"),
      appUserId: optStr(query.appUserId, "appUserId"),
      unreadOnly: parseBool(query.unreadOnly),
      search: optStr(query.search, "search"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * 会話詳細を取得する（関連 lead/customer/case/appUser 概要含む）。
   * @param req HTTP リクエスト
   * @param id 会話 ID
   * @returns 会話詳細集約
   */
  @RequireRoles("staff")
  @Get(":id")
  async getDetail(@Req() req: HttpRequest, @Param("id") id: string) {
    return this.svc.getDetail(requireCtx(req), id);
  }

  /**
   * 会話にスタッフを指派する。
   * @param req HTTP リクエスト
   * @param id 会話 ID
   * @param body 指派リクエストボディ
   * @returns 更新後の会話
   */
  @RequireRoles("staff")
  @Patch(":id/assign")
  async assign(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: AssignBody,
  ) {
    return this.svc.assign(requireCtx(req), id, {
      ownerUserId: optStr(body.ownerUserId, "ownerUserId"),
    });
  }

  /**
   * 会話を閉じる。
   * @param req HTTP リクエスト
   * @param id 会話 ID
   * @returns 閉じた会話
   */
  @RequireRoles("staff")
  @Patch(":id/close")
  async close(@Req() req: HttpRequest, @Param("id") id: string) {
    return this.svc.close(requireCtx(req), id);
  }

  /**
   * 会話を再開する。
   * @param req HTTP リクエスト
   * @param id 会話 ID
   * @returns 再開した会話
   */
  @RequireRoles("staff")
  @Patch(":id/reopen")
  async reopen(@Req() req: HttpRequest, @Param("id") id: string) {
    return this.svc.reopen(requireCtx(req), id);
  }
}
