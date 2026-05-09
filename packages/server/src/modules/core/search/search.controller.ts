import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import type { RequestContext } from "../tenancy/requestContext";
import { SearchService } from "./search.service";
import type { SearchResponse } from "./search.types";
import { QUERY_MAX_LENGTH, QUERY_MIN_LENGTH } from "./search.types";

type HttpRequest = {
  requestContext?: RequestContext;
};

type SearchQuery = {
  q?: unknown;
};

/**
 * 全局搜索端点。前端调用 `/api/admin/search?q=...`，
 * 与其他 admin 控制器（admin/leads, admin/conversations）保持同一约定。
 */
@Controller("admin/search")
export class SearchController {
  /**
   * 创建全局搜索控制器。
   *
   * @param searchService - 搜索服务。
   */
  constructor(
    @Inject(SearchService)
    private readonly searchService: SearchService,
  ) {}

  /**
   * 全局検索を実行し、各エンティティ横断で結果を返す。
   *
   * @param req - HTTP リクエスト（テナントコンテキスト付き）。
   * @param query - クエリパラメータ。
   * @returns 検索結果。
   */
  @RequirePermission(PERMISSION_CODES.CASE_VIEW)
  @Get()
  async search(
    @Req() req: HttpRequest,
    @Query() query: SearchQuery,
  ): Promise<SearchResponse> {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const q = parseQuery(query.q);
    return this.searchService.search(ctx, q);
  }
}

function parseQuery(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string")
    throw new BadRequestException("Invalid query parameter");
  const trimmed = value.trim();
  if (trimmed.length > QUERY_MAX_LENGTH)
    throw new BadRequestException(
      `Query too long (max ${String(QUERY_MAX_LENGTH)} characters)`,
    );
  if (trimmed.length < QUERY_MIN_LENGTH) return "";
  return trimmed;
}
