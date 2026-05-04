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
import { BillingSummaryService } from "./billingSummary.service";
const VALID_STATUSES = new Set(["due", "partial", "paid", "overdue"]);
function parseOptionalStatus(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !VALID_STATUSES.has(value)) {
    throw new BadRequestException(
      `Invalid status. Must be one of: ${[...VALID_STATUSES].join(", ")}`,
    );
  }
  return value;
}
function parseOptionalString(value, field) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} must be a non-empty string`);
  }
  return value;
}
function parseOptionalQ(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new BadRequestException("q must be a string");
  }
  if (value.length > 100) {
    throw new BadRequestException("q must be 100 characters or fewer");
  }
  return value.length > 0 ? value : undefined;
}
function parseOptionalDateOnly(value, field) {
  if (value === undefined || value === null) return undefined;
  const raw = parseOptionalString(value, field);
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return d.toISOString().slice(0, 10);
}
/**
 * 全组织收费汇总 controller（§2.2）。
 *
 * GET /api/billing-summary
 */
let BillingSummaryController = class BillingSummaryController {
  billingSummaryService;
  /**
   * 初始化全组织收费汇总 controller。
   *
   * @param billingSummaryService - 收费汇总 service
   */
  constructor(billingSummaryService) {
    this.billingSummaryService = billingSummaryService;
  }
  /**
   * 获取全组织收费汇总（totalDue / totalReceived / totalOutstanding / overdueAmount）。
   *
   * @param req - HTTP 请求
   * @param query - 可选过滤参数
   * @returns BillingListSummaryDto
   */
  async getSummary(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.billingSummaryService.getSummary(ctx, {
      status: parseOptionalStatus(query.status),
      groupId: parseOptionalString(query.groupId, "groupId"),
      ownerId: parseOptionalString(query.ownerId, "ownerId"),
      q: parseOptionalQ(query.q),
      from: parseOptionalDateOnly(query.from, "from"),
      to: parseOptionalDateOnly(query.to, "to"),
    });
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
  BillingSummaryController.prototype,
  "getSummary",
  null,
);
BillingSummaryController = __decorate(
  [
    Controller("billing-summary"),
    __param(0, Inject(BillingSummaryService)),
    __metadata("design:paramtypes", [BillingSummaryService]),
  ],
  BillingSummaryController,
);
export { BillingSummaryController };
//# sourceMappingURL=billingSummary.controller.js.map
