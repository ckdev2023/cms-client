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

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import type { RequestContext } from "../tenancy/requestContext";
import { DocumentAssetsService } from "./documentAssets.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type ListDocumentAssetsQuery = {
  caseId?: unknown;
  materialCode?: unknown;
  ownerCustomerId?: unknown;
  onlyExpired?: unknown;
  limit?: unknown;
};

function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0" || value === "") return false;
  return undefined;
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (!Number.isFinite(n)) throw new BadRequestException("Invalid limit");
  const i = Math.floor(n);
  if (i < 1 || i > 200) throw new BadRequestException("Invalid limit");
  return i;
}

/** DocumentAssets 只读查询接口（写路径仅由 upload 内部触发）。 */
@Controller("document-assets")
export class DocumentAssetsController {
  /**
   * 构造函数。
   * @param documentAssetsService 资料资产服务实例
   */
  constructor(
    @Inject(DocumentAssetsService)
    private readonly documentAssetsService: DocumentAssetsService,
  ) {}

  /**
   * 查询资料资产列表。
   * @param req HTTP 请求对象
   * @param query 查询参数
   * @returns 资产列表
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListDocumentAssetsQuery) {
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
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get(":id/shared-expiry-risk")
  async getSharedExpiryRisk(@Req() req: HttpRequest, @Param("id") id: string) {
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
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get(":id")
  async get(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const asset = await this.documentAssetsService.get(ctx, id);
    if (!asset) throw new BadRequestException("Document asset not found");
    return asset;
  }
}
