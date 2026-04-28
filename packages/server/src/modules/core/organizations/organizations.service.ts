import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";

type OrganizationSettingsRow = {
  settings: unknown;
};

type OrganizationActorRow = {
  name: string | null;
};

/**
 * 当前组织设置模型。
 */
export type OrganizationSettings = {
  visibility: {
    allowCrossGroupCaseCreate: boolean;
    allowPrincipalViewCrossGroupCollab: boolean;
  };
  storageRoot: {
    rootLabel: string | null;
    rootPath: string | null;
    updatedBy: string | null;
    updatedAt: string | null;
  };
};

/**
 * 组织设置更新载荷。
 */
export type OrganizationSettingsUpdateInput = {
  visibility?: Partial<OrganizationSettings["visibility"]>;
  storageRoot?: {
    rootLabel?: string | null;
    rootPath?: string | null;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : value === null ? null : null;
}

/**
 * 将数据库中的组织设置归一化为服务层模型。
 *
 * @param value - 数据库存储的原始 settings 值
 * @returns 归一化后的组织设置
 */
export function normalizeOrganizationSettings(
  value: unknown,
): OrganizationSettings {
  const root = isRecord(value) ? value : {};
  const visibility = isRecord(root.visibility) ? root.visibility : {};
  const storageRoot = isRecord(root.storageRoot) ? root.storageRoot : {};

  return {
    visibility: {
      allowCrossGroupCaseCreate:
        readBoolean(visibility.allowCrossGroupCaseCreate) ?? false,
      allowPrincipalViewCrossGroupCollab:
        readBoolean(visibility.allowPrincipalViewCrossGroupCollab) ?? false,
    },
    storageRoot: {
      rootLabel: readNullableString(storageRoot.rootLabel),
      rootPath: readNullableString(storageRoot.rootPath),
      updatedBy: readNullableString(storageRoot.updatedBy),
      updatedAt: readNullableString(storageRoot.updatedAt),
    },
  };
}

function hasVisibilityUpdate(
  input: OrganizationSettingsUpdateInput,
): input is OrganizationSettingsUpdateInput & {
  visibility: Partial<OrganizationSettings["visibility"]>;
} {
  const visibility = input.visibility;
  return visibility !== undefined && Object.keys(visibility).length > 0;
}

function hasStorageRootUpdate(
  input: OrganizationSettingsUpdateInput,
): input is OrganizationSettingsUpdateInput & {
  storageRoot: { rootLabel?: string | null; rootPath?: string | null };
} {
  const storageRoot = input.storageRoot;
  return storageRoot !== undefined && Object.keys(storageRoot).length > 0;
}

function buildNextOrganizationSettings(input: {
  current: OrganizationSettings;
  patch: OrganizationSettingsUpdateInput;
  actorDisplayName: string;
  updatedAt: string;
}): OrganizationSettings {
  const next: OrganizationSettings = {
    visibility: { ...input.current.visibility },
    storageRoot: { ...input.current.storageRoot },
  };

  if (hasVisibilityUpdate(input.patch)) {
    next.visibility = {
      ...next.visibility,
      ...input.patch.visibility,
    };
  }

  if (hasStorageRootUpdate(input.patch)) {
    next.storageRoot = {
      ...next.storageRoot,
      ...(input.patch.storageRoot.rootLabel !== undefined
        ? { rootLabel: input.patch.storageRoot.rootLabel }
        : {}),
      ...(input.patch.storageRoot.rootPath !== undefined
        ? { rootPath: input.patch.storageRoot.rootPath }
        : {}),
      updatedBy: input.actorDisplayName,
      updatedAt: input.updatedAt,
    };
  }

  return next;
}

/**
 * 组织设置服务：读取并持久化 organizations.settings JSONB。
 */
@Injectable()
export class OrganizationsService {
  /**
   * 创建组织设置服务。
   *
   * @param pool - Postgres 连接池
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * 读取当前组织设置。
   *
   * @param ctx - 当前租户请求上下文
   * @returns 当前组织设置
   */
  async getSettings(ctx: RequestContext): Promise<OrganizationSettings> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<OrganizationSettingsRow>(
      "select settings from organizations where id = $1 limit 1",
      [ctx.orgId],
    );
    const row = result.rows.at(0);
    if (!row) throw new NotFoundException("Organization not found");
    return normalizeOrganizationSettings(row.settings);
  }

  /**
   * 更新当前组织设置。
   *
   * @param ctx - 当前租户请求上下文
   * @param input - 设置补丁
   * @returns 更新后的组织设置
   */
  async updateSettings(
    ctx: RequestContext,
    input: OrganizationSettingsUpdateInput,
  ): Promise<OrganizationSettings> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const current = await this.getSettings(ctx);

    if (!hasVisibilityUpdate(input) && !hasStorageRootUpdate(input)) {
      return current;
    }

    const actorResult = await tenantDb.query<OrganizationActorRow>(
      "select name from users where id = $1 limit 1",
      [ctx.userId],
    );
    const actorName = actorResult.rows[0]?.name?.trim();
    const actorDisplayName =
      actorName && actorName.length > 0 ? actorName : ctx.userId;
    const next = buildNextOrganizationSettings({
      current,
      patch: input,
      actorDisplayName,
      updatedAt: new Date().toISOString(),
    });

    const result = await tenantDb.query<OrganizationSettingsRow>(
      "update organizations set settings = $2::jsonb, updated_at = now() where id = $1 returning settings",
      [ctx.orgId, JSON.stringify(next)],
    );
    const row = result.rows.at(0);
    if (!row) {
      throw new BadRequestException("Failed to update organization settings");
    }

    return normalizeOrganizationSettings(row.settings);
  }
}
