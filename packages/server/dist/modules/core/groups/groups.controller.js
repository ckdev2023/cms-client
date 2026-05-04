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
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { GroupsService } from "./groups.service";
const VALID_STATUS_FILTERS = new Set(["active", "disabled"]);
function parseStatusFilter(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string" && VALID_STATUS_FILTERS.has(value))
    return value;
  throw new BadRequestException(
    'Invalid status filter; expected "active" or "disabled"',
  );
}
function requireString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new BadRequestException(`${name} is required`);
  return value.trim();
}
function parseOptionalNullableString(value, name) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${name}`);
}
/**
 * 業務分組 CRUD 接口（全端点要求 manager 角色）。
 */
let GroupsController = class GroupsController {
  groupsService;
  /**
   *
   * @param groupsService
   */
  /**
   * 業務分組コントローラーを生成する。
   *
   * @param groupsService - グループサービス
   */
  constructor(groupsService) {
    this.groupsService = groupsService;
  }
  /**
   * グループ一覧を取得する。
   *
   * @param req HTTP リクエスト
   * @param query クエリパラメータ（status で絞り込み可）
   * @returns グループ一覧
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const status = parseStatusFilter(query.status);
    return this.groupsService.listGroups(ctx, { status });
  }
  /**
   * グループ詳細を取得する。
   *
   * @param req HTTP リクエスト
   * @param id グループ ID
   * @returns グループ詳細
   */
  async detail(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const detail = await this.groupsService.getGroupDetail(ctx, id);
    if (!detail) throw new NotFoundException("Group not found");
    return detail;
  }
  /**
   * 新規グループを作成する。
   *
   * @param req HTTP リクエスト
   * @param body 作成パラメータ
   * @returns 作成されたグループ詳細
   */
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const name = requireString(body.name, "name");
    const description = parseOptionalNullableString(
      body.description,
      "description",
    );
    return this.groupsService.createGroup(ctx, { name, description });
  }
  /**
   * グループを改名する。
   *
   * @param req HTTP リクエスト
   * @param id グループ ID
   * @param body 改名パラメータ
   * @returns 更新後のグループ詳細
   */
  async rename(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const name = requireString(body.name, "name");
    const result = await this.groupsService.renameGroup(ctx, id, { name });
    if (!result) throw new NotFoundException("Group not found");
    return result;
  }
  /**
   * グループを停用する（論理削除）。
   *
   * @param req HTTP リクエスト
   * @param id グループ ID
   * @param body 停用パラメータ（reason 任意）
   * @returns 更新後のグループ詳細
   */
  async disable(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const reason = parseOptionalNullableString(body.reason, "reason");
    const result = await this.groupsService.disableGroup(ctx, id, {
      reason: reason ?? undefined,
    });
    if (!result) throw new NotFoundException("Group not found");
    return result;
  }
};
__decorate(
  [
    RequireRoles("manager"),
    Get(),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  GroupsController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Get(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  GroupsController.prototype,
  "detail",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Post(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  GroupsController.prototype,
  "create",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Patch(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  GroupsController.prototype,
  "rename",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Post(":id/disable"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  GroupsController.prototype,
  "disable",
  null,
);
GroupsController = __decorate(
  [
    Controller("groups"),
    __param(0, Inject(GroupsService)),
    __metadata("design:paramtypes", [GroupsService]),
  ],
  GroupsController,
);
export { GroupsController };
//# sourceMappingURL=groups.controller.js.map
