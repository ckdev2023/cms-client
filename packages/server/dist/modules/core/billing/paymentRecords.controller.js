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
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { PaymentRecordsService } from "./paymentRecords.service";
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}
function parseOptionalString(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  return requireString(value, field);
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
function parseISODateTime(value, field) {
  const raw = requireString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`Invalid ${field}`);
  return date.toISOString();
}
function parseOptionalPaymentMethod(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireString(value, "paymentMethod");
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
const VALID_RECORD_STATUSES = new Set(["valid", "voided", "reversed", "all"]);
function parseOptionalRecordStatus(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const s = requireString(value, "recordStatus");
  if (!VALID_RECORD_STATUSES.has(s)) {
    throw new BadRequestException(
      `recordStatus must be one of: ${[...VALID_RECORD_STATUSES].join(", ")}`,
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
function parseOptionalISODateTime(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = requireString(value, field);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`Invalid ${field}`);
  return date.toISOString();
}
/**
 * PaymentRecords REST controller (P0 §3.20 / §6).
 */
let PaymentRecordsController = class PaymentRecordsController {
  paymentRecordsService;
  /**
   * Initialize payment records controller.
   *
   * @param paymentRecordsService - payment records service
   */
  constructor(paymentRecordsService) {
    this.paymentRecordsService = paymentRecordsService;
  }
  /**
   * Record a new payment.
   *
   * @param req - HTTP request
   * @param body - creation body
   * @returns created PaymentRecord
   */
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.paymentRecordsService.create(ctx, {
      billingPlanId: requireString(body.billingPlanId, "billingPlanId"),
      amountReceived: parseNumber(body.amountReceived, "amountReceived"),
      receivedAt: parseISODateTime(body.receivedAt, "receivedAt"),
      paymentMethod: parseOptionalPaymentMethod(body.paymentMethod),
      note: parseOptionalNullableString(body.note, "note"),
    });
  }
  /**
   * List payment records.
   *
   * @param req - HTTP request
   * @param query - query params
   * @returns paginated PaymentRecord list
   */
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.paymentRecordsService.list(ctx, {
      billingPlanId: parseOptionalString(query.billingPlanId, "billingPlanId"),
      caseId: parseOptionalString(query.caseId, "caseId"),
      recordStatus: parseOptionalRecordStatus(query.recordStatus),
      q: parseOptionalSearchQuery(query.q),
      from: parseOptionalISODateTime(query.from, "from"),
      to: parseOptionalISODateTime(query.to, "to"),
      groupId: parseOptionalString(query.groupId, "groupId"),
      ownerId: parseOptionalString(query.ownerId, "ownerId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }
  /**
   * Get a single payment record.
   *
   * @param req - HTTP request
   * @param id - payment record ID
   * @returns PaymentRecord
   */
  async get(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const paymentRecord = await this.paymentRecordsService.get(ctx, id);
    if (!paymentRecord)
      throw new BadRequestException("Payment record not found");
    return paymentRecord;
  }
  /**
   * Void a payment record (soft-delete per P0 §6.2).
   *
   * @param req - HTTP request
   * @param id - payment record ID
   * @param body - void reason
   * @returns voided PaymentRecord
   */
  async void(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.paymentRecordsService.void(ctx, id, {
      reasonCode: requireString(body.reasonCode, "reasonCode"),
      reasonNote: parseOptionalNullableString(body.reasonNote, "reasonNote"),
    });
  }
  /**
   * Reverse a payment record (D1 方案 A：原地翻状态，不引入负数金额).
   *
   * @param req - HTTP request
   * @param id - payment record ID
   * @param body - reverse reason (reasonCode required)
   * @returns reversed PaymentRecord
   */
  async reverse(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.paymentRecordsService.reverse(ctx, id, {
      reasonCode: requireString(body.reasonCode, "reasonCode"),
      reasonNote: parseOptionalNullableString(body.reasonNote, "reasonNote"),
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
  PaymentRecordsController.prototype,
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
  PaymentRecordsController.prototype,
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
  PaymentRecordsController.prototype,
  "get",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Post(":id/void"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  PaymentRecordsController.prototype,
  "void",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Post(":id/reverse"),
    __param(0, Req()),
    __param(1, Param("id")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise),
  ],
  PaymentRecordsController.prototype,
  "reverse",
  null,
);
PaymentRecordsController = __decorate(
  [
    Controller("payment-records"),
    __param(0, Inject(PaymentRecordsService)),
    __metadata("design:paramtypes", [PaymentRecordsService]),
  ],
  PaymentRecordsController,
);
export { PaymentRecordsController };
//# sourceMappingURL=paymentRecords.controller.js.map
