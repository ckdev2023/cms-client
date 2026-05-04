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
  Controller,
  Get,
  Inject,
  Param,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { DocumentAssetsService } from "./documentAssets.service";
function parseOptionalString(value, field) {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}
function parseOptionalBoolean(value) {
  if (value === undefined) return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0" || value === "") return false;
  return undefined;
}
function parseLimit(value) {
  if (value === undefined) return undefined;
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}
/** DocumentAssets 只读查询接口（写路径仅由 upload 内部触发）。 */
let DocumentAssetsController = class DocumentAssetsController {
  documentAssetsService;
  /**
   * 构造函数。
   * @param documentAssetsService 资料资产服务实例
   */
  constructor(documentAssetsService) {
    this.documentAssetsService = documentAssetsService;
  }
  /**
   * 查询资料资产列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 资产列表
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.documentAssetsService.list(ctx, {
      caseId: parseOptionalString(query.caseId, "caseId"),
      materialCode: parseOptionalString(query.materialCode, "materialCode"),
      ownerCustomerId: parseOptionalString(
        query.ownerCustomerId,
        "ownerCustomerId",
      ),
      onlyExpired: parseOptionalBoolean(query.onlyExpired),
      limit: parseLimit(query.limit),
    });
  }
  /**
   * 取 asset 最新版本 expiry_date 与 now 比较，列出受影响案件 + 建议码。
   * @param req HTTP 请求对象
   * @param id 资产 ID
   * @returns 共享过期风险数据
   */
  async getSharedExpiryRisk(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const result = await this.documentAssetsService.getSharedExpiryRisk(
      ctx,
      id,
    );
    if (!result) throw new BadRequestException("Document asset not found");
    return result;
  }
  /**
   * 按 ID 获取单个资料资产。
   * @param req HTTP 请求对象
   * @param id 资产 ID
   * @returns 资产详情
   */
  async get(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const asset = await this.documentAssetsService.get(ctx, id);
    if (!asset) throw new BadRequestException("Document asset not found");
    return asset;
  }
};
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
  DocumentAssetsController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("viewer"),
    Get(":id/shared-expiry-risk"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  DocumentAssetsController.prototype,
  "getSharedExpiryRisk",
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
  DocumentAssetsController.prototype,
  "get",
  null,
);
DocumentAssetsController = __decorate(
  [
    Controller("document-assets"),
    __param(0, Inject(DocumentAssetsService)),
    __metadata("design:paramtypes", [DocumentAssetsService]),
  ],
  DocumentAssetsController,
);
export { DocumentAssetsController };
//# sourceMappingURL=documentAssets.controller.js.map
