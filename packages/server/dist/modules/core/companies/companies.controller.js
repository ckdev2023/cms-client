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
import { CompaniesService } from "./companies.service";
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
function parseOptionalNumber(value, name) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
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
 * Company CRUD 接口。
 */
let CompaniesController = class CompaniesController {
  companiesService;
  /**
   * 构造函数。
   * @param companiesService 企业客户服务实例
   */
  constructor(companiesService) {
    this.companiesService = companiesService;
  }
  /**
   * 创建企业客户。
   * @param req HTTP 请求对象
   * @param body 创建请求体
   * @returns 创建成功的企业客户信息
   */
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.companiesService.create(ctx, {
      companyName: requireString(body.companyName, "companyName"),
      companyNo: parseOptionalString(body.companyNo, "companyNo"),
      corporateNumber: parseOptionalString(
        body.corporateNumber,
        "corporateNumber",
      ),
      establishedDate: parseOptionalString(
        body.establishedDate,
        "establishedDate",
      ),
      capitalAmount: parseOptionalNumber(body.capitalAmount, "capitalAmount"),
      address: parseOptionalString(body.address, "address"),
      businessScope: parseOptionalString(body.businessScope, "businessScope"),
      employeeCount: parseOptionalNumber(body.employeeCount, "employeeCount"),
      fiscalYearEnd: parseOptionalString(body.fiscalYearEnd, "fiscalYearEnd"),
      website: parseOptionalString(body.website, "website"),
      contactPhone: parseOptionalString(body.contactPhone, "contactPhone"),
      contactEmail: parseOptionalString(body.contactEmail, "contactEmail"),
      ownerUserId: parseOptionalString(body.ownerUserId, "ownerUserId"),
    });
  }
  /**
   * 获取企业客户列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 企业客户列表
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.companiesService.list(ctx, {
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
      keyword: typeof query.keyword === "string" ? query.keyword : undefined,
    });
  }
  /**
   * 获取指定企业客户详情。
   * @param req HTTP 请求对象
   * @param id 企业客户 ID
   * @returns 匹配的企业客户信息
   */
  async get(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const company = await this.companiesService.get(ctx, id);
    if (!company) throw new BadRequestException("Company not found");
    return company;
  }
  /**
   * 更新企业客户信息。
   * @param req HTTP 请求对象
   * @param id 企业客户 ID
   * @param body 更新请求体
   * @returns 更新后的企业客户信息
   */
  async update(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.companiesService.update(ctx, id, {
      companyName:
        body.companyName !== undefined
          ? requireString(body.companyName, "companyName")
          : undefined,
      companyNo: parseOptionalString(body.companyNo, "companyNo"),
      corporateNumber: parseOptionalString(
        body.corporateNumber,
        "corporateNumber",
      ),
      establishedDate: parseOptionalString(
        body.establishedDate,
        "establishedDate",
      ),
      capitalAmount: parseOptionalNumber(body.capitalAmount, "capitalAmount"),
      address: parseOptionalString(body.address, "address"),
      businessScope: parseOptionalString(body.businessScope, "businessScope"),
      employeeCount: parseOptionalNumber(body.employeeCount, "employeeCount"),
      fiscalYearEnd: parseOptionalString(body.fiscalYearEnd, "fiscalYearEnd"),
      website: parseOptionalString(body.website, "website"),
      contactPhone: parseOptionalString(body.contactPhone, "contactPhone"),
      contactEmail: parseOptionalString(body.contactEmail, "contactEmail"),
      ownerUserId: parseOptionalString(body.ownerUserId, "ownerUserId"),
    });
  }
  /**
   * 删除企业客户。
   * @param req HTTP 请求对象
   * @param id 企业客户 ID
   * @returns 删除成功状态
   */
  async delete(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    await this.companiesService.softDelete(ctx, id);
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
  CompaniesController.prototype,
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
  CompaniesController.prototype,
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
  CompaniesController.prototype,
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
  CompaniesController.prototype,
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
  CompaniesController.prototype,
  "delete",
  null,
);
CompaniesController = __decorate(
  [
    Controller("companies"),
    __param(0, Inject(CompaniesService)),
    __metadata("design:paramtypes", [CompaniesService]),
  ],
  CompaniesController,
);
export { CompaniesController };
//# sourceMappingURL=companies.controller.js.map
