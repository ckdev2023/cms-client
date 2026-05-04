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
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { MessagesAdminService } from "./messages.admin.service";
function requireCtx(req) {
  const ctx = req.requestContext;
  if (!ctx) throw new UnauthorizedException("Missing request context");
  return ctx;
}
function parsePage(v) {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid page");
  const i = Math.floor(n);
  if (i < 1) throw new BadRequestException("Invalid page");
  return i;
}
function parseLimit(v) {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}
function reqStr(v, f) {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new BadRequestException(f + " is required");
  }
  return v.trim();
}
function optStr(v, f) {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestException("Invalid " + f);
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}
function parseBool(v) {
  if (v === undefined) return undefined;
  if (v === true || v === "true" || v === "1") return true;
  if (v === false || v === "false" || v === "0") return false;
  return undefined;
}
/**
 * Admin 会話メッセージ管理コントローラ。
 */
let MessagesAdminController = class MessagesAdminController {
  svc;
  /**
   * コンストラクタ。
   * @param svc メッセージ管理サービス
   */
  constructor(svc) {
    this.svc = svc;
  }
  /**
   * 会話内メッセージ一覧を取得する（自動未読クリア）。
   * @param req HTTP リクエスト
   * @param conversationId 会話 ID
   * @param query ページネーションパラメータ
   * @returns メッセージ一覧と総件数
   */
  async list(req, conversationId, query) {
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
  async send(req, conversationId, body) {
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
  async retryTranslation(req, conversationId, messageId) {
    return this.svc.retryTranslation(
      requireCtx(req),
      conversationId,
      messageId,
    );
  }
};
__decorate(
  [
    RequireRoles("staff"),
    Get(),
    __param(0, Req()),
    __param(1, Param("conversationId")),
    __param(2, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  MessagesAdminController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(),
    __param(0, Req()),
    __param(1, Param("conversationId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  MessagesAdminController.prototype,
  "send",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":messageId/retry-translation"),
    __param(0, Req()),
    __param(1, Param("conversationId")),
    __param(2, Param("messageId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise),
  ],
  MessagesAdminController.prototype,
  "retryTranslation",
  null,
);
MessagesAdminController = __decorate(
  [
    Controller("admin/conversations/:conversationId/messages"),
    __param(0, Inject(MessagesAdminService)),
    __metadata("design:paramtypes", [MessagesAdminService]),
  ],
  MessagesAdminController,
);
export { MessagesAdminController };
//# sourceMappingURL=messages.admin.controller.js.map
