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
import { BillingPlansService } from "./billingPlans.service";
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}
function parseOptionalNullableString(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireString(value, field);
}
function parseNumber(value, field) {
  const num = Number(value);
  if (!Number.isFinite(num)) throw new BadRequestException(`Invalid ${field}`);
  return num;
}
function parseOptionalNumber(value, field) {
  if (value === undefined) return undefined;
  return parseNumber(value, field);
}
function parseDateOnly(value, field) {
  const raw = requireString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`Invalid ${field}`);
  return date.toISOString().slice(0, 10);
}
function parseOptionalNullableDateOnly(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return parseDateOnly(value, field);
}
function parseOptionalString(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  return requireString(value, field);
}
const VALID_LIST_STATUSES = new Set(["due", "partial", "paid", "overdue"]);
function parseOptionalBillingPlanStatus(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const s = requireString(value, "status");
  if (!VALID_LIST_STATUSES.has(s)) {
    throw new BadRequestException(
      `status must be one of: ${[...VALID_LIST_STATUSES].join(", ")}`,
    );
  }
  return s;
}
function parseOptionalSearchQuery(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const s = requireString(value, "q");
  if (s.length > 100) {
    throw new BadRequestException("q must be at most 100 characters");
  }
  return s;
}
function parseOptionalGateMode(value) {
  if (value === undefined) return undefined;
  const s = requireString(value, "gateEffectMode");
  if (s !== "off" && s !== "warn" && s !== "block") {
    throw new BadRequestException(
      "gateEffectMode must be 'off', 'warn' or 'block'",
    );
  }
  return s;
}
function parsePage(value) {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1)
    throw new BadRequestException("Invalid page");
  return Math.floor(n);
}
function parseLimit(value) {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 200) {
    throw new BadRequestException("Invalid limit");
  }
  return Math.floor(n);
}
/**
 * BillingPlans REST controller (P0 §3.20).
 */
let BillingPlansController = class BillingPlansController {
  billingPlansService;
  /**
   * Initialize billing plans controller.
   *
   * @param billingPlansService - billing plans service
   */
  constructor(billingPlansService) {
    this.billingPlansService = billingPlansService;
  }
  /**
   * Create a billing plan node.
   *
   * @param req - HTTP request
   * @param body - creation body
   * @returns created BillingPlan
   */
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.billingPlansService.create(ctx, {
      caseId: requireString(body.caseId, "caseId"),
      milestoneName: parseOptionalNullableString(
        body.milestoneName,
        "milestoneName",
      ),
      amountDue: parseNumber(body.amountDue, "amountDue"),
      dueDate: parseOptionalNullableDateOnly(body.dueDate, "dueDate"),
      gateEffectMode: parseOptionalGateMode(body.gateEffectMode),
      remark: parseOptionalNullableString(body.remark, "remark"),
    });
  }
  /**
   * List billing plans by case.
   *
   * @param req - HTTP request
   * @param query - query params
   * @returns paginated BillingPlan list
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.billingPlansService.list(ctx, {
      caseId: parseOptionalString(query.caseId, "caseId"),
      status: parseOptionalBillingPlanStatus(query.status),
      groupId: parseOptionalString(query.groupId, "groupId"),
      ownerId: parseOptionalString(query.ownerId, "ownerId"),
      q: parseOptionalSearchQuery(query.q),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }
  /**
   * Get a single billing plan.
   *
   * @param req - HTTP request
   * @param id - billing plan ID
   * @returns BillingPlan
   */
  async get(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const plan = await this.billingPlansService.get(ctx, id);
    if (!plan) throw new BadRequestException("Billing plan not found");
    return plan;
  }
  /**
   * Update a billing plan (non-status fields).
   *
   * @param req - HTTP request
   * @param id - billing plan ID
   * @param body - update body
   * @returns updated BillingPlan
   */
  async update(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.billingPlansService.update(ctx, id, {
      milestoneName: parseOptionalNullableString(
        body.milestoneName,
        "milestoneName",
      ),
      amountDue: parseOptionalNumber(body.amountDue, "amountDue"),
      dueDate: parseOptionalNullableDateOnly(body.dueDate, "dueDate"),
      gateEffectMode: parseOptionalGateMode(body.gateEffectMode),
      remark: parseOptionalNullableString(body.remark, "remark"),
    });
  }
  /**
   * Transition a billing plan's status.
   *
   * @param req - HTTP request
   * @param id - billing plan ID
   * @param body - transition body
   * @returns updated BillingPlan
   */
  async transition(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.billingPlansService.transition(ctx, id, {
      toStatus: requireString(body.toStatus, "toStatus"),
    });
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
  BillingPlansController.prototype,
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
  BillingPlansController.prototype,
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
  BillingPlansController.prototype,
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
  BillingPlansController.prototype,
  "update",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/transition"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  BillingPlansController.prototype,
  "transition",
  null,
);
BillingPlansController = __decorate(
  [
    Controller("billing-plans"),
    __param(0, Inject(BillingPlansService)),
    __metadata("design:paramtypes", [BillingPlansService]),
  ],
  BillingPlansController,
);
export { BillingPlansController };
//# sourceMappingURL=billingPlans.controller.js.map
