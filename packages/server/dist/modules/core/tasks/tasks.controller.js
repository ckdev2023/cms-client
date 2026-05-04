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
import { isUuid } from "../tenancy/uuid";
import { TasksService } from "./tasks.service";
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
let TasksController = class TasksController {
  tasksService;
  constructor(tasksService) {
    this.tasksService = tasksService;
  }
  async create(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const assigneeUserId = parseOptionalNullableString(
      body.assigneeUserId,
      "assigneeUserId",
    );
    if (
      assigneeUserId !== null &&
      assigneeUserId !== undefined &&
      !isUuid(assigneeUserId)
    ) {
      throw new BadRequestException({
        errorCode: "TASK_INVALID_ASSIGNEE_ID",
        message: "assigneeUserId must be a valid UUID",
      });
    }
    return this.tasksService.create(ctx, {
      caseId: parseOptionalNullableString(body.caseId, "caseId"),
      title: requireString(body.title, "title"),
      description: parseOptionalNullableString(body.description, "description"),
      taskType: parseOptionalString(body.taskType, "taskType"),
      assigneeUserId,
      priority: parseOptionalString(body.priority, "priority"),
      dueAt: parseOptionalNullableISODate(body.dueAt, "dueAt"),
      sourceType: parseOptionalNullableString(body.sourceType, "sourceType"),
      sourceId: parseOptionalNullableString(body.sourceId, "sourceId"),
    });
  }
  async list(req, query) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.tasksService.list(ctx, {
      caseId: parseOptionalString(query.caseId, "caseId"),
      assigneeUserId: parseOptionalString(
        query.assigneeUserId,
        "assigneeUserId",
      ),
      status: parseOptionalString(query.status, "status"),
      page: parsePage(query.page),
      limit: parseLimit(query.limit),
    });
  }
  async complete(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.tasksService.complete(ctx, id);
  }
  async cancel(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.tasksService.cancel(ctx, id);
  }
  async get(req, id) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const task = await this.tasksService.get(ctx, id);
    if (!task) throw new BadRequestException("Task not found");
    return task;
  }
  async update(req, id, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    const updateAssigneeUserId = parseOptionalNullableString(
      body.assigneeUserId,
      "assigneeUserId",
    );
    if (
      updateAssigneeUserId !== null &&
      updateAssigneeUserId !== undefined &&
      !isUuid(updateAssigneeUserId)
    ) {
      throw new BadRequestException({
        errorCode: "TASK_INVALID_ASSIGNEE_ID",
        message: "assigneeUserId must be a valid UUID",
      });
    }
    return this.tasksService.update(ctx, id, {
      caseId: parseOptionalNullableString(body.caseId, "caseId"),
      title:
        body.title !== undefined
          ? requireString(body.title, "title")
          : undefined,
      description: parseOptionalNullableString(body.description, "description"),
      taskType: parseOptionalString(body.taskType, "taskType"),
      assigneeUserId: updateAssigneeUserId,
      priority: parseOptionalString(body.priority, "priority"),
      dueAt: parseOptionalNullableISODate(body.dueAt, "dueAt"),
      status: parseOptionalString(body.status, "status"),
      sourceType: parseOptionalNullableString(body.sourceType, "sourceType"),
      sourceId: parseOptionalNullableString(body.sourceId, "sourceId"),
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
  TasksController.prototype,
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
  TasksController.prototype,
  "list",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/complete"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  TasksController.prototype,
  "complete",
  null,
);
__decorate(
  [
    RequireRoles("staff"),
    Post(":id/cancel"),
    __param(0, Req()),
    __param(1, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise),
  ],
  TasksController.prototype,
  "cancel",
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
  TasksController.prototype,
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
  TasksController.prototype,
  "update",
  null,
);
TasksController = __decorate(
  [
    Controller("tasks"),
    __param(0, Inject(TasksService)),
    __metadata("design:paramtypes", [TasksService]),
  ],
  TasksController,
);
export { TasksController };
//# sourceMappingURL=tasks.controller.js.map
