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
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { BillingCollectionsService } from "./billingCollections.service";
const MAX_CASE_IDS = 200;
/**
 * 批量催款 controller（§2.7）。
 *
 * POST /api/billing-collections/bulk
 */
let BillingCollectionsController = class BillingCollectionsController {
  billingCollectionsService;
  /**
   * 初始化批量催款 controller。
   *
   * @param billingCollectionsService - 批量催款 service
   */
  constructor(billingCollectionsService) {
    this.billingCollectionsService = billingCollectionsService;
  }
  /**
   * 批量生成催款任务。
   *
   * @param req - HTTP 请求
   * @param body - 请求体
   * @returns CollectionResult
   */
  async bulk(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const caseIds = parseCaseIds(body.caseIds);
    return this.billingCollectionsService.bulkCollect(ctx, caseIds);
  }
};
__decorate(
  [
    RequireRoles("staff"),
    Post("bulk"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  BillingCollectionsController.prototype,
  "bulk",
  null,
);
BillingCollectionsController = __decorate(
  [
    Controller("billing-collections"),
    __param(0, Inject(BillingCollectionsService)),
    __metadata("design:paramtypes", [BillingCollectionsService]),
  ],
  BillingCollectionsController,
);
export { BillingCollectionsController };
function parseCaseIds(value) {
  if (!Array.isArray(value)) {
    throw new BadRequestException("caseIds must be an array");
  }
  if (value.length === 0) {
    throw new BadRequestException("caseIds must not be empty");
  }
  if (value.length > MAX_CASE_IDS) {
    throw new BadRequestException(
      `caseIds must contain at most ${String(MAX_CASE_IDS)} items`,
    );
  }
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0) {
      throw new BadRequestException("Each caseId must be a non-empty string");
    }
  }
  return value;
}
//# sourceMappingURL=billingCollections.controller.js.map
