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
  Delete,
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
import { ContactPersonsService } from "./contactPersons.service";
function requireString(value, name) {
  if (typeof value !== "string" || value.length === 0)
    throw new BadRequestException(`${name} is required`);
  return value;
}
function parseOptionalString(value, name) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${name}`);
}
function parsePage(value) {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : undefined;
}
function parseLimit(value) {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : undefined;
}
/**
 * ContactPerson CRUD 接口。
 */
let ContactPersonsController = class ContactPersonsController {
  contactPersonsService;
  /**
   * 构造函数。
   * @param contactPersonsService 联系人服务实例
   */
  constructor(contactPersonsService) {
    this.contactPersonsService = contactPersonsService;
  }
  /**
   * 创建联系人。
   * @param req HTTP 请求对象
   * @param body 创建请求体
   * @returns 创建成功的联系人信息
   */
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.contactPersonsService.create(ctx, {
      name: requireString(body.name, "name"),
      companyId: parseOptionalString(body.companyId, "companyId"),
      customerId: parseOptionalString(body.customerId, "customerId"),
      roleTitle: parseOptionalString(body.roleTitle, "roleTitle"),
      relationType: parseOptionalString(body.relationType, "relationType"),
      phone: parseOptionalString(body.phone, "phone"),
      email: parseOptionalString(body.email, "email"),
      preferredLanguage:
        typeof body.preferredLanguage === "string"
          ? body.preferredLanguage
          : undefined,
    });
  }
  /**
   * 获取联系人列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 联系人列表
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.contactPersonsService.list(ctx, {
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
      companyId:
        typeof query.companyId === "string" ? query.companyId : undefined,
      customerId:
        typeof query.customerId === "string" ? query.customerId : undefined,
    });
  }
  /**
   * 获取指定联系人详情。
   * @param req HTTP 请求对象
   * @param id 联系人 ID
   * @returns 匹配的联系人信息
   */
  async get(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const contactPerson = await this.contactPersonsService.get(ctx, id);
    if (!contactPerson)
      throw new BadRequestException("Contact person not found");
    return contactPerson;
  }
  /**
   * 更新联系人信息。
   * @param req HTTP 请求对象
   * @param id 联系人 ID
   * @param body 更新请求体
   * @returns 更新后的联系人信息
   */
  async update(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.contactPersonsService.update(ctx, id, {
      name:
        body.name !== undefined ? requireString(body.name, "name") : undefined,
      companyId: parseOptionalString(body.companyId, "companyId"),
      customerId: parseOptionalString(body.customerId, "customerId"),
      roleTitle: parseOptionalString(body.roleTitle, "roleTitle"),
      relationType: parseOptionalString(body.relationType, "relationType"),
      phone: parseOptionalString(body.phone, "phone"),
      email: parseOptionalString(body.email, "email"),
      preferredLanguage:
        typeof body.preferredLanguage === "string"
          ? body.preferredLanguage
          : undefined,
    });
  }
  /**
   * 删除联系人。
   * @param req HTTP 请求对象
   * @param id 联系人 ID
   * @returns 删除成功状态
   */
  async delete(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    await this.contactPersonsService.softDelete(ctx, id);
    return { ok: true };
  }
};
__decorate(
  [
    RequireRoles("staff"),
    Post(),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  ContactPersonsController.prototype,
  "create",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get(),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  ContactPersonsController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  ContactPersonsController.prototype,
  "get",
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
  ContactPersonsController.prototype,
  "update",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Delete(":id"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  ContactPersonsController.prototype,
  "delete",
  null,
);
ContactPersonsController = __decorate(
  [
    Controller("contact-persons"),
    __param(0, Inject(ContactPersonsService)),
    __metadata("design:paramtypes", [ContactPersonsService]),
  ],
  ContactPersonsController,
);
export { ContactPersonsController };
//# sourceMappingURL=contactPersons.controller.js.map
