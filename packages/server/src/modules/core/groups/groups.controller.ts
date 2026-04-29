import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators";
import type { RequestContext } from "../tenancy/requestContext";
import { GroupsService } from "./groups.service";
import type { GroupStatusFilter } from "./groups.types";

type HttpRequest = {
  requestContext?: RequestContext;
};

type ListGroupsQuery = {
  status?: unknown;
};

type CreateGroupBody = {
  name?: unknown;
  description?: unknown;
};

type RenameGroupBody = {
  name?: unknown;
};

type DisableGroupBody = {
  reason?: unknown;
};

const VALID_STATUS_FILTERS = new Set<string>(["active", "disabled"]);

function parseStatusFilter(value: unknown): GroupStatusFilter | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string" && VALID_STATUS_FILTERS.has(value))
    return value as GroupStatusFilter;
  throw new BadRequestException(
    'Invalid status filter; expected "active" or "disabled"',
  );
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0)
    throw new BadRequestException(`${name} is required`);
  return value.trim();
}

function parseOptionalNullableString(
  value: unknown,
  name: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  throw new BadRequestException(`Invalid ${name}`);
}

/**
 * 業務分組 CRUD 接口（全端点要求 manager 角色）。
 */
@Controller("groups")
export class GroupsController {
  /**
   *
   * @param groupsService
   */
  /**
   * 業務分組コントローラーを生成する。
   *
   * @param groupsService - グループサービス
   */
  constructor(
    @Inject(GroupsService) private readonly groupsService: GroupsService,
  ) {}

  /**
   * グループ一覧を取得する。
   *
   * @param req HTTP リクエスト
   * @param query クエリパラメータ（status で絞り込み可）
   * @returns グループ一覧
   */
  @RequireRoles("manager")
  @Get()
  async list(@Req() req: HttpRequest, @Query() query: ListGroupsQuery) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const status = parseStatusFilter(query.status);
    return this.groupsService.listGroups(ctx, { status });
  }

  /**
   * グループ詳細を取得する。
   *
   * @param req HTTP リクエスト
   * @param id グループ ID
   * @returns グループ詳細
   */
  @RequireRoles("manager")
  @Get(":id")
  async detail(@Req() req: HttpRequest, @Param("id") id: string) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const detail = await this.groupsService.getGroupDetail(ctx, id);
    if (!detail) throw new NotFoundException("Group not found");
    return detail;
  }

  /**
   * 新規グループを作成する。
   *
   * @param req HTTP リクエスト
   * @param body 作成パラメータ
   * @returns 作成されたグループ詳細
   */
  @RequireRoles("manager")
  @Post()
  async create(@Req() req: HttpRequest, @Body() body: CreateGroupBody) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const name = requireString(body.name, "name");
    const description = parseOptionalNullableString(
      body.description,
      "description",
    );

    return this.groupsService.createGroup(ctx, { name, description });
  }

  /**
   * グループを改名する。
   *
   * @param req HTTP リクエスト
   * @param id グループ ID
   * @param body 改名パラメータ
   * @returns 更新後のグループ詳細
   */
  @RequireRoles("manager")
  @Patch(":id")
  async rename(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: RenameGroupBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const name = requireString(body.name, "name");
    const result = await this.groupsService.renameGroup(ctx, id, { name });
    if (!result) throw new NotFoundException("Group not found");
    return result;
  }

  /**
   * グループを停用する（論理削除）。
   *
   * @param req HTTP リクエスト
   * @param id グループ ID
   * @param body 停用パラメータ（reason 任意）
   * @returns 更新後のグループ詳細
   */
  @RequireRoles("manager")
  @Post(":id/disable")
  async disable(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: DisableGroupBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const reason = parseOptionalNullableString(body.reason, "reason");
    const result = await this.groupsService.disableGroup(ctx, id, {
      reason: reason ?? undefined,
    });
    if (!result) throw new NotFoundException("Group not found");
    return result;
  }
}
