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
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readBoolean(value) {
  return typeof value === "boolean" ? value : null;
}
function readNullableString(value) {
  return typeof value === "string" ? value : value === null ? null : null;
}
/**
 * 将数据库中的组织设置归一化为服务层模型。
 *
 * @param value - 数据库存储的原始 settings 值
 * @returns 归一化后的组织设置
 */
export function normalizeOrganizationSettings(value) {
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
const STORAGE_ROOT_USER_FIELDS = ["rootLabel", "rootPath"];
/**
 * 比较两版组织设置，输出变化字段列表与变更前后值。
 *
 * 只比较用户可编辑字段；storageRoot 的 updatedBy / updatedAt 是自动元数据，不参与差分。
 *
 * @param prev - 变更前设置
 * @param next - 变更后设置
 * @returns 差分结果（fields 为空表示无变化）
 */
export function diffSettings(prev, next) {
  const fields = [];
  const before = {};
  const after = {};
  for (const key of Object.keys(prev.visibility)) {
    if (prev.visibility[key] !== next.visibility[key]) {
      const path = `visibility.${key}`;
      fields.push(path);
      before[path] = prev.visibility[key];
      after[path] = next.visibility[key];
    }
  }
  for (const key of STORAGE_ROOT_USER_FIELDS) {
    if (prev.storageRoot[key] !== next.storageRoot[key]) {
      const path = `storageRoot.${key}`;
      fields.push(path);
      before[path] = prev.storageRoot[key];
      after[path] = next.storageRoot[key];
    }
  }
  return { fields, before, after };
}
function hasVisibilityUpdate(input) {
  const visibility = input.visibility;
  return visibility !== undefined && Object.keys(visibility).length > 0;
}
function hasStorageRootUpdate(input) {
  const storageRoot = input.storageRoot;
  return storageRoot !== undefined && Object.keys(storageRoot).length > 0;
}
function buildNextOrganizationSettings(input) {
  const next = {
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
let OrganizationsService = class OrganizationsService {
  pool;
  timelineService;
  /**
   * 创建组织设置服务。
   *
   * @param pool - Postgres 连接池
   * @param timelineService - 统一 Timeline 写入服务
   */
  constructor(pool, timelineService) {
    this.pool = pool;
    this.timelineService = timelineService;
  }
  /**
   * 读取当前组织设置。
   *
   * @param ctx - 当前租户请求上下文
   * @returns 当前组织设置
   */
  async getSettings(ctx) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
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
  async updateSettings(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const current = await this.getSettings(ctx);
    if (!hasVisibilityUpdate(input) && !hasStorageRootUpdate(input)) {
      return current;
    }
    const actorResult = await tenantDb.query(
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
    const result = await tenantDb.query(
      "update organizations set settings = $2::jsonb, updated_at = now() where id = $1 returning settings",
      [ctx.orgId, JSON.stringify(next)],
    );
    const row = result.rows.at(0);
    if (!row) {
      throw new BadRequestException("Failed to update organization settings");
    }
    const diff = diffSettings(current, next);
    if (diff.fields.length > 0) {
      await this.timelineService.write(ctx, {
        entityType: "organization",
        entityId: ctx.orgId,
        action: "org_settings_changed",
        payload: {
          before: diff.before,
          after: diff.after,
          fields: diff.fields,
        },
      });
    }
    return normalizeOrganizationSettings(row.settings);
  }
};
OrganizationsService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(TimelineService)),
    __metadata("design:paramtypes", [Pool, TimelineService]),
  ],
  OrganizationsService,
);
export { OrganizationsService };
//# sourceMappingURL=organizations.service.js.map
