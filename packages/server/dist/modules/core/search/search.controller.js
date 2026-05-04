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
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { SearchService } from "./search.service";
import { QUERY_MAX_LENGTH, QUERY_MIN_LENGTH } from "./search.types";
/**
 * 全局搜索端点。
 */
let SearchController = class SearchController {
  searchService;
  /**
   * 创建全局搜索控制器。
   *
   * @param searchService - 搜索服务。
   */
  constructor(searchService) {
    this.searchService = searchService;
  }
  /**
   * 全局検索を実行し、各エンティティ横断で結果を返す。
   *
   * @param req - HTTP リクエスト（テナントコンテキスト付き）。
   * @param query - クエリパラメータ。
   * @returns 検索結果。
   */
  async search(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const q = parseQuery(query.q);
    return this.searchService.search(ctx, q);
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
  SearchController.prototype,
  "search",
  null,
);
SearchController = __decorate(
  [
    Controller("search"),
    __param(0, Inject(SearchService)),
    __metadata("design:paramtypes", [SearchService]),
  ],
  SearchController,
);
export { SearchController };
function parseQuery(value) {
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
//# sourceMappingURL=search.controller.js.map
