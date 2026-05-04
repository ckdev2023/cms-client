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
  Patch,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { RequireRoles } from "../auth/auth.decorators";
import { OrganizationsService } from "./organizations.service";
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseOptionalBoolean(value, name) {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  throw new BadRequestException(`Invalid ${name}`);
}
function parseOptionalNullableString(value, name) {
  if (value === undefined) return undefined;
  if (value === null || typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${name}`);
}
function parseUpdateBody(body) {
  const input = {};
  if (body.visibility !== undefined) {
    if (!isRecord(body.visibility)) {
      throw new BadRequestException("Invalid visibility");
    }
    const visibility = {};
    const allowCrossGroupCaseCreate = parseOptionalBoolean(
      body.visibility.allowCrossGroupCaseCreate,
      "visibility.allowCrossGroupCaseCreate",
    );
    const allowPrincipalViewCrossGroupCollab = parseOptionalBoolean(
      body.visibility.allowPrincipalViewCrossGroupCollab,
      "visibility.allowPrincipalViewCrossGroupCollab",
    );
    if (allowCrossGroupCaseCreate !== undefined) {
      visibility.allowCrossGroupCaseCreate = allowCrossGroupCaseCreate;
    }
    if (allowPrincipalViewCrossGroupCollab !== undefined) {
      visibility.allowPrincipalViewCrossGroupCollab =
        allowPrincipalViewCrossGroupCollab;
    }
    if (Object.keys(visibility).length > 0) input.visibility = visibility;
  }
  if (body.storageRoot !== undefined) {
    if (!isRecord(body.storageRoot)) {
      throw new BadRequestException("Invalid storageRoot");
    }
    const storageRoot = {};
    const rootLabel = parseOptionalNullableString(
      body.storageRoot.rootLabel,
      "storageRoot.rootLabel",
    );
    const rootPath = parseOptionalNullableString(
      body.storageRoot.rootPath,
      "storageRoot.rootPath",
    );
    if (rootLabel !== undefined) storageRoot.rootLabel = rootLabel;
    if (rootPath !== undefined) storageRoot.rootPath = rootPath;
    if (Object.keys(storageRoot).length > 0) input.storageRoot = storageRoot;
  }
  return input;
}
/**
 * 当前组织设置接口。
 */
let OrganizationsController = class OrganizationsController {
  organizationsService;
  /**
   * 创建组织设置控制器。
   *
   * @param organizationsService - 组织设置服务
   */
  constructor(organizationsService) {
    this.organizationsService = organizationsService;
  }
  /**
   * 获取当前组织设置。
   *
   * @param req - 当前请求对象
   * @returns 当前组织设置
   */
  async getCurrentSettings(req) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.organizationsService.getSettings(ctx);
  }
  /**
   * 更新当前组织设置。
   *
   * @param req - 当前请求对象
   * @param body - 原始更新载荷
   * @returns 更新后的组织设置
   */
  async updateCurrentSettings(req, body) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.organizationsService.updateSettings(ctx, parseUpdateBody(body));
  }
};
__decorate(
  [
    RequireRoles("viewer"),
    Get("current/settings"),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise),
  ],
  OrganizationsController.prototype,
  "getCurrentSettings",
  null,
);
__decorate(
  [
    RequireRoles("manager"),
    Patch("current/settings"),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise),
  ],
  OrganizationsController.prototype,
  "updateCurrentSettings",
  null,
);
OrganizationsController = __decorate(
  [
    Controller("organizations"),
    __param(0, Inject(OrganizationsService)),
    __metadata("design:paramtypes", [OrganizationsService]),
  ],
  OrganizationsController,
);
export { OrganizationsController };
//# sourceMappingURL=organizations.controller.js.map
