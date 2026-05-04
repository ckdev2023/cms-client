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
/* eslint-disable jsdoc/require-jsdoc */
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
import { CommunicationLogsService } from "./communicationLogs.service";
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}
function parseOptionalString(value, field) {
  if (value === undefined) return undefined;
  return requireString(value, field);
}
function parseOptionalNullableString(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireString(value, field);
}
function parseOptionalBoolean(value, field) {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  throw new BadRequestException(`Invalid ${field}`);
}
function parseISODate(value, field) {
  const str = requireString(value, field);
  const date = new Date(str);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`Invalid ${field}`);
  return date.toISOString();
}
function parseOptionalNullableISODate(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return parseISODate(value, field);
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
let CommunicationLogsController = class CommunicationLogsController {
  communicationLogsService;
  constructor(communicationLogsService) {
    this.communicationLogsService = communicationLogsService;
  }
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.communicationLogsService.create(ctx, {
      caseId: parseOptionalNullableString(body.caseId, "caseId"),
      customerId: parseOptionalNullableString(body.customerId, "customerId"),
      companyId: parseOptionalNullableString(body.companyId, "companyId"),
      channelType: requireString(body.channelType, "channelType"),
      direction: parseOptionalString(body.direction, "direction"),
      subject: parseOptionalNullableString(body.subject, "subject"),
      contentSummary: parseOptionalNullableString(
        body.contentSummary,
        "contentSummary",
      ),
      fullContent: parseOptionalNullableString(body.fullContent, "fullContent"),
      visibleToClient: parseOptionalBoolean(
        body.visibleToClient,
        "visibleToClient",
      ),
      followUpRequired: parseOptionalBoolean(
        body.followUpRequired,
        "followUpRequired",
      ),
      followUpDueAt: parseOptionalNullableISODate(
        body.followUpDueAt,
        "followUpDueAt",
      ),
    });
  }
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.communicationLogsService.list(ctx, {
      caseId: parseOptionalString(query.caseId, "caseId"),
      customerId: parseOptionalString(query.customerId, "customerId"),
      companyId: parseOptionalString(query.companyId, "companyId"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }
  async followUps(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.communicationLogsService.followUps(ctx, {
      caseId: parseOptionalString(query.caseId, "caseId"),
      customerId: parseOptionalString(query.customerId, "customerId"),
      companyId: parseOptionalString(query.companyId, "companyId"),
    });
  }
  async get(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const communicationLog = await this.communicationLogsService.get(ctx, id);
    if (!communicationLog) {
      throw new BadRequestException("Communication log not found");
    }
    return communicationLog;
  }
  async update(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.communicationLogsService.update(ctx, id, {
      caseId: parseOptionalNullableString(body.caseId, "caseId"),
      customerId: parseOptionalNullableString(body.customerId, "customerId"),
      companyId: parseOptionalNullableString(body.companyId, "companyId"),
      channelType: parseOptionalString(body.channelType, "channelType"),
      direction: parseOptionalString(body.direction, "direction"),
      subject: parseOptionalNullableString(body.subject, "subject"),
      contentSummary: parseOptionalNullableString(
        body.contentSummary,
        "contentSummary",
      ),
      fullContent: parseOptionalNullableString(body.fullContent, "fullContent"),
      visibleToClient: parseOptionalBoolean(
        body.visibleToClient,
        "visibleToClient",
      ),
      followUpRequired: parseOptionalBoolean(
        body.followUpRequired,
        "followUpRequired",
      ),
      followUpDueAt: parseOptionalNullableISODate(
        body.followUpDueAt,
        "followUpDueAt",
      ),
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
  CommunicationLogsController.prototype,
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
  CommunicationLogsController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Get("follow-ups"),
    __param(0, Req()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  CommunicationLogsController.prototype,
  "followUps",
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
  CommunicationLogsController.prototype,
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
  CommunicationLogsController.prototype,
  "update",
  null,
);
CommunicationLogsController = __decorate(
  [
    Controller("communication-logs"),
    __param(0, Inject(CommunicationLogsService)),
    __metadata("design:paramtypes", [CommunicationLogsService]),
  ],
  CommunicationLogsController,
);
export { CommunicationLogsController };
//# sourceMappingURL=communicationLogs.controller.js.map
