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
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { LeadsAdminService } from "./leads.admin.service";
// ── Parsers ──
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
function reqStr(v, f) {
  const r = optStr(v, f);
  if (!r) throw new BadRequestException(`${f} is required`);
  return r;
}
function optNum(v, f) {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException(`Invalid ${f}`);
  return n;
}
function parseScope(v) {
  if (v === undefined) return undefined;
  if (v === "mine" || v === "group" || v === "all") return v;
  throw new BadRequestException("Invalid scope");
}
function strArr(v, f) {
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
let LeadsAdminController = class LeadsAdminController {
  svc;
  /**
   * コンストラクタ。
   * @param svc Lead 管理サービス
   */
  constructor(svc) {
    this.svc = svc;
  }
  /**
   * Lead 一覧を取得する。
   * @param req HTTP リクエスト
   * @param query 検索パラメータ
   * @returns Lead 一覧と総件数
   */
  async list(req, query) {
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
  async dedup(req, query) {
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
  async getDetail(req, id) {
    return this.svc.getDetail(requireCtx(req), id);
  }
  /**
   * Lead の業務フィールドを更新する。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @param body 更新リクエストボディ
   * @returns 更新後の Lead
   */
  async update(req, id, body) {
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
  async transitionStatus(req, id, body) {
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
  async addFollowup(req, id, body) {
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
  async listFollowups(req, id) {
    return this.svc.listFollowups(requireCtx(req), id);
  }
  /**
   * Lead のログ一覧を取得する。
   * @param req HTTP リクエスト
   * @param id Lead ID
   * @returns ログ一覧
   */
  async listLogs(req, id) {
    return this.svc.listLogs(requireCtx(req), id);
  }
  /**
   * 一括担当者変更を実行する。
   * @param req HTTP リクエスト
   * @param body 一括担当者変更リクエストボディ
   * @returns 更新件数
   */
  async bulkAssign(req, body) {
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
  async bulkFollowup(req, body) {
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
  async bulkStatus(req, body) {
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
  async bulkTags(req, body) {
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
  async bulkExport(req, body) {
    return this.svc.bulkExport(
      requireCtx(req),
      strArr(body.leadIds, "leadIds"),
    );
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
  LeadsAdminController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Get("dedup"),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  LeadsAdminController.prototype,
  "dedup",
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
  LeadsAdminController.prototype,
  "getDetail",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Patch(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  LeadsAdminController.prototype,
  "update",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Patch(":id/status"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  LeadsAdminController.prototype,
  "transitionStatus",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/followups"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  LeadsAdminController.prototype,
  "addFollowup",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Get(":id/followups"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  LeadsAdminController.prototype,
  "listFollowups",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Get(":id/logs"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  LeadsAdminController.prototype,
  "listLogs",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post("bulk/assign"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  LeadsAdminController.prototype,
  "bulkAssign",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post("bulk/followup"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  LeadsAdminController.prototype,
  "bulkFollowup",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post("bulk/status"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  LeadsAdminController.prototype,
  "bulkStatus",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post("bulk/tags"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  LeadsAdminController.prototype,
  "bulkTags",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post("bulk/export"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  LeadsAdminController.prototype,
  "bulkExport",
  null,
);
LeadsAdminController = __decorate(
  [
    Controller("admin/leads"),
    __param(0, Inject(LeadsAdminService)),
    __metadata("design:paramtypes", [LeadsAdminService]),
  ],
  LeadsAdminController,
);
export { LeadsAdminController };
//# sourceMappingURL=leads.admin.controller.js.map
