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
import type { RequestContext } from "../tenancy/requestContext";
import {
  OrganizationsService,
  type OrganizationSettingsUpdateInput,
} from "./organizations.service";

type HttpRequest = {
  requestContext?: RequestContext;
};

type UpdateOrganizationSettingsBody = {
  visibility?: unknown;
  storageRoot?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOptionalBoolean(
  value: unknown,
  name: string,
): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  throw new BadRequestException(`Invalid ${name}`);
}

function parseOptionalNullableString(
  value: unknown,
  name: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${name}`);
}

function parseUpdateBody(
  body: UpdateOrganizationSettingsBody,
): OrganizationSettingsUpdateInput {
  const input: OrganizationSettingsUpdateInput = {};

  if (body.visibility !== undefined) {
    if (!isRecord(body.visibility)) {
      throw new BadRequestException("Invalid visibility");
    }

    const visibility: OrganizationSettingsUpdateInput["visibility"] = {};
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

    const storageRoot: OrganizationSettingsUpdateInput["storageRoot"] = {};
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
@Controller("organizations")
export class OrganizationsController {
  /**
   * 创建组织设置控制器。
   *
   * @param organizationsService - 组织设置服务
   */
  constructor(
    @Inject(OrganizationsService)
    private readonly organizationsService: OrganizationsService,
  ) {}

  /**
   * 获取当前组织设置。
   *
   * @param req - 当前请求对象
   * @returns 当前组织设置
   */
  @RequireRoles("viewer")
  @Get("current/settings")
  async getCurrentSettings(@Req() req: HttpRequest) {
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
  @RequireRoles("manager")
  @Patch("current/settings")
  async updateCurrentSettings(
    @Req() req: HttpRequest,
    @Body() body: UpdateOrganizationSettingsBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");
    return this.organizationsService.updateSettings(ctx, parseUpdateBody(body));
  }
}
