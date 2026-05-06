import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import type { RequestContext } from "../tenancy/requestContext";
import { MessagesAdminService } from "./messages.admin.service";

type HttpRequest = { requestContext?: RequestContext };

type ListMessagesQuery = {
  page?: unknown;
  limit?: unknown;
};

type SendMessageBody = {
  originalLanguage?: unknown;
  originalText?: unknown;
  kind?: unknown;
  visibleScope?: unknown;
  forceOriginal?: unknown;
};

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

function reqStr(v: unknown, f: string): string {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new BadRequestException(f + " is required");
  }
  return v.trim();
}

function optStr(v: unknown, f: string): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestException("Invalid " + f);
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function parseBool(v: unknown): boolean | undefined {
  if (v === undefined) return undefined;
  if (v === true || v === "true" || v === "1") return true;
  if (v === false || v === "false" || v === "0") return false;
  return undefined;
}

const ConversationIdParam = () => Param("conversationId", new ParseUUIDPipe());
const MessageIdParam = () => Param("messageId", new ParseUUIDPipe());

/**
 * Admin 会話メッセージ管理コントローラ。
 */
@Controller("admin/conversations/:conversationId/messages")
export class MessagesAdminController {
  /**
   * コンストラクタ。
   * @param svc メッセージ管理サービス
   */
  constructor(
    @Inject(MessagesAdminService)
    private readonly svc: MessagesAdminService,
  ) {}

  /**
   * 会話内メッセージ一覧を取得する（自動未読クリア）。
   * @param req HTTP リクエスト
   * @param conversationId 会話 ID
   * @param query ページネーションパラメータ
   * @returns メッセージ一覧と総件数
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Get()
  async list(
    @Req() req: HttpRequest,
    @ConversationIdParam() conversationId: string,
    @Query() query: ListMessagesQuery,
  ) {
    return this.svc.list(requireCtx(req), conversationId, {
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }

  /**
   * Admin がメッセージを送信する（翻訳キュー連携）。
   * @param req HTTP リクエスト
   * @param conversationId 会話 ID
   * @param body 送信リクエストボディ
   * @returns 作成されたメッセージ
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post()
  async send(
    @Req() req: HttpRequest,
    @ConversationIdParam() conversationId: string,
    @Body() body: SendMessageBody,
  ) {
    return this.svc.send(requireCtx(req), conversationId, {
      originalLanguage: reqStr(body.originalLanguage, "originalLanguage"),
      originalText: reqStr(body.originalText, "originalText"),
      kind: optStr(body.kind, "kind"),
      visibleScope: optStr(body.visibleScope, "visibleScope"),
      forceOriginal: parseBool(body.forceOriginal),
    });
  }

  /**
   * 翻訳失敗メッセージの翻訳を再試行する。
   * @param req HTTP リクエスト
   * @param conversationId 会話 ID
   * @param messageId メッセージ ID
   * @returns 更新後のメッセージ
   */
  @RequirePermission(PERMISSION_CODES.CASE_EDIT)
  @Post(":messageId/retry-translation")
  async retryTranslation(
    @Req() req: HttpRequest,
    @ConversationIdParam() conversationId: string,
    @MessageIdParam() messageId: string,
  ) {
    return this.svc.retryTranslation(
      requireCtx(req),
      conversationId,
      messageId,
    );
  }
}
