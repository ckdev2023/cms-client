import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { RequirePermission } from "../auth/auth.decorators";
import { PERMISSION_CODES } from "../auth/permissions.codes";
import type { RequestContext } from "../tenancy/requestContext";
import { GroupMembersService } from "./groupMembers.service";
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

type AddMemberBody = {
  userId?: unknown;
  isPrimary?: unknown;
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
 * 業務分組 CRUD + メンバー管理接口（全端点要求 manager 角色）。
 */
@Controller("groups")
export class GroupsController {
  /**
   * 業務分組コントローラーを生成する。
   *
   * @param groupsService - グループサービス
   * @param groupMembersService - グループメンバー管理サービス
   */
  constructor(
    @Inject(GroupsService) private readonly groupsService: GroupsService,
    @Inject(GroupMembersService)
    private readonly groupMembersService: GroupMembersService,
  ) {}

  /**
   * グループ一覧を取得する。
   *
   * @param req - HTTP リクエスト
   * @param query - クエリパラメータ（status で絞り込み可）
   * @returns グループ一覧
   */
  @RequirePermission(PERMISSION_CODES.GROUP_VIEW)
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
   * @param req - HTTP リクエスト
   * @param id - グループ ID
   * @returns グループ詳細
   */
  @RequirePermission(PERMISSION_CODES.GROUP_VIEW)
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
   * @param req - HTTP リクエスト
   * @param body - 作成パラメータ
   * @returns 作成されたグループ詳細
   */
  @RequirePermission(PERMISSION_CODES.GROUP_MANAGE)
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
   * @param req - HTTP リクエスト
   * @param id - グループ ID
   * @param body - 改名パラメータ
   * @returns 更新後のグループ詳細
   */
  @RequirePermission(PERMISSION_CODES.GROUP_MANAGE)
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
   * @param req - HTTP リクエスト
   * @param id - グループ ID
   * @param body - 停用パラメータ（reason 任意）
   * @returns 更新後のグループ詳細
   */
  @RequirePermission(PERMISSION_CODES.GROUP_MANAGE)
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

  /**
   * グループにメンバーを追加する。
   *
   * @param req - HTTP リクエスト
   * @param id - グループ ID
   * @param body - メンバー追加パラメータ
   * @returns 追加されたメンバー DTO
   */
  @RequirePermission(PERMISSION_CODES.GROUP_MANAGE)
  @Post(":id/members")
  async addMember(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Body() body: AddMemberBody,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    const userId = requireString(body.userId, "userId");
    const isPrimary = body.isPrimary === true;

    return this.groupMembersService.addGroupMember(ctx, id, {
      userId,
      isPrimary,
    });
  }

  /**
   * グループからメンバーを論理削除する。
   *
   * @param req - HTTP リクエスト
   * @param id - グループ ID
   * @param userId - ユーザー ID
   * @returns 成功フラグ
   */
  @RequirePermission(PERMISSION_CODES.GROUP_MANAGE)
  @Delete(":id/members/:userId")
  @HttpCode(200)
  async removeMember(
    @Req() req: HttpRequest,
    @Param("id") id: string,
    @Param("userId") userId: string,
  ) {
    const ctx = req.requestContext;
    if (!ctx) throw new UnauthorizedException("Missing request context");

    await this.groupMembersService.removeGroupMember(ctx, id, userId);
    return { ok: true };
  }
}
