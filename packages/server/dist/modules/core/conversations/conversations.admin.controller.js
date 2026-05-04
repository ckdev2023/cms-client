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
  Patch,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { ConversationsAdminService } from "./conversations.admin.service";
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
function optStr(v, f) {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestException(`Invalid ${f}`);
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}
function parseBool(v) {
  if (v === undefined) return undefined;
  if (v === "true" || v === true || v === "1") return true;
  if (v === "false" || v === false || v === "0") return false;
  return undefined;
}
/**
 * Admin 会話管理コントローラ。
 */
let ConversationsAdminController = class ConversationsAdminController {
  svc;
  /**
   * コンストラクタ。
   * @param svc 会話管理サービス
   */
  constructor(svc) {
    this.svc = svc;
  }
  /**
   * 会話一覧を取得する。
   * @param req HTTP リクエスト
   * @param query 検索パラメータ
   * @returns 会話一覧と総件数
   */
  async list(req, query) {
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
  async getDetail(req, id) {
    return this.svc.getDetail(requireCtx(req), id);
  }
  /**
   * 会話にスタッフを指派する。
   * @param req HTTP リクエスト
   * @param id 会話 ID
   * @param body 指派リクエストボディ
   * @returns 更新後の会話
   */
  async assign(req, id, body) {
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
  async close(req, id) {
    return this.svc.close(requireCtx(req), id);
  }
  /**
   * 会話を再開する。
   * @param req HTTP リクエスト
   * @param id 会話 ID
   * @returns 再開した会話
   */
  async reopen(req, id) {
    return this.svc.reopen(requireCtx(req), id);
  }
};
__decorate(
  [
    RequireRoles("staff"),
    Get(),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  ConversationsAdminController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Get(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  ConversationsAdminController.prototype,
  "getDetail",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Patch(":id/assign"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  ConversationsAdminController.prototype,
  "assign",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Patch(":id/close"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  ConversationsAdminController.prototype,
  "close",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Patch(":id/reopen"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  ConversationsAdminController.prototype,
  "reopen",
  null,
);
ConversationsAdminController = __decorate(
  [
    Controller("admin/conversations"),
    __param(0, Inject(ConversationsAdminService)),
    __metadata("design:paramtypes", [ConversationsAdminService]),
  ],
  ConversationsAdminController,
);
export { ConversationsAdminController };
//# sourceMappingURL=conversations.admin.controller.js.map
