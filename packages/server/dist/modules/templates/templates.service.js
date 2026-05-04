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
/* eslint-disable max-lines */
import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { Pool } from "pg";
import { createTenantDb } from "../core/tenancy/tenantDb";
import { toIsoTimestampString } from "../../infra/utils/timestamps";
import { shouldUseTemplateByRollout } from "./templates.model";
const normalizeConfig = (v) => {
  if (!v || typeof v !== "object") return {};
  if (Array.isArray(v)) return {};
  return v;
};
const normalizeRollout = (v) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return { type: "all" };
  const obj = v;
  if (obj.type === "percentage") {
    const percentageRaw = obj.percentage;
    const percentage =
      typeof percentageRaw === "number"
        ? percentageRaw
        : typeof percentageRaw === "string"
          ? Number(percentageRaw)
          : NaN;
    const salt =
      typeof obj.salt === "string" && obj.salt.length > 0
        ? obj.salt
        : "default";
    if (Number.isFinite(percentage)) {
      return { type: "percentage", percentage, salt };
    }
  }
  return { type: "all" };
};
const normalizeMode = (v) => (v === "template" ? "template" : "legacy");
function computeTemplateVersionLockKey(input) {
  const raw = `${input.orgId}:${input.kind}:${input.key}`;
  const digest = crypto.createHash("sha256").update(raw).digest();
  let n = 0n;
  for (let i = 0; i < 8; i += 1) {
    n = (n << 8n) + BigInt(digest[i] ?? 0);
  }
  if (n > 0x7fffffffffffffffn) {
    n -= 0x10000000000000000n;
  }
  return n.toString();
}
const mapVersionRow = (r) => ({
  id: r.id,
  orgId: r.org_id,
  kind: r.kind,
  key: r.key,
  version: r.version,
  config: normalizeConfig(r.config),
  createdByUserId: r.created_by_user_id,
  createdAt: toIsoTimestampString(r.created_at),
});
const mapReleaseRow = (r) => ({
  id: r.id,
  orgId: r.org_id,
  kind: r.kind,
  key: r.key,
  mode: normalizeMode(r.mode),
  currentVersion: r.current_version,
  previousVersion: r.previous_version,
  rollout: normalizeRollout(r.rollout),
  updatedByUserId: r.updated_by_user_id,
  updatedAt: toIsoTimestampString(r.updated_at),
});
/**
 * 模板版本与发布管理服务。
 */
let TemplatesService = class TemplatesService {
  pool;
  /**
   * 创建服务。
   *
   * @param pool PostgreSQL 连接池
   */
  constructor(pool) {
    this.pool = pool;
  }
  /**
   * 切换为 legacy 模式。
   *
   * @param ctx 请求上下文
   * @param kind 模板类型
   * @param key 模板 key
   * @returns 发布记录
   */
  async setLegacyMode(ctx, kind, key) {
    return this.setMode(ctx, { kind, key, mode: "legacy" });
  }
  /**
   * 将发布记录更新到指定版本。
   *
   * @param ctx 请求上下文
   * @param input 模板标识
   * @param input.kind 模板类型
   * @param input.key 模板 key
   * @param toVersion 回滚目标版本
   * @param previousVersion 作为 previous_version 写入的版本
   * @returns 发布记录
   */
  async updateReleaseToVersion(ctx, input, toVersion, previousVersion) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `
        update template_releases
        set mode = 'template',
            current_version = $1,
            previous_version = $2,
            updated_by_user_id = $3,
            updated_at = now()
        where org_id = $4 and kind = $5 and key = $6
        returning id, org_id, kind, key, mode, current_version, previous_version, rollout, updated_by_user_id, updated_at
      `,
      [
        toVersion,
        previousVersion,
        ctx.userId,
        ctx.orgId,
        input.kind,
        input.key,
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new Error("Failed to rollback template release");
    return mapReleaseRow(row);
  }
  /**
   * 查询模板版本列表（按 version 倒序）。
   *
   * @param ctx 请求上下文
   * @param input 查询条件
   * @param input.kind 模板类型
   * @param input.key 模板 key
   * @param input.limit 返回条数上限
   * @returns 版本列表
   */
  async listVersions(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const result = await tenantDb.query(
      `
        select id, org_id, kind, key, version, config, created_by_user_id, created_at
        from template_versions
        where kind = $1 and key = $2
        order by version desc, id desc
        limit $3
      `,
      [input.kind, input.key, limit],
    );
    return result.rows.map(mapVersionRow);
  }
  /**
   * 创建新版本：version 按 (org, kind, key) 自增。
   *
   * @param ctx 请求上下文
   * @param input 创建入参
   * @param input.kind 模板类型
   * @param input.key 模板 key
   * @param input.config 模板配置
   * @returns 创建后的版本记录
   */
  async createVersion(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const lockKey = computeTemplateVersionLockKey({
      orgId: ctx.orgId,
      kind: input.kind,
      key: input.key,
    });
    return tenantDb.transaction(async (tx) => {
      await tx.query("select pg_advisory_xact_lock($1::bigint)", [lockKey]);
      const versionResult = await tx.query(
        `
          select coalesce(max(version), 0) as max_version
          from template_versions
          where kind = $1 and key = $2
        `,
        [input.kind, input.key],
      );
      const nextVersion = (versionResult.rows.at(0)?.max_version ?? 0) + 1;
      const insertResult = await tx.query(
        `
          insert into template_versions (org_id, kind, key, version, config, created_by_user_id)
          values ($1, $2, $3, $4, $5::jsonb, $6)
          returning id, org_id, kind, key, version, config, created_by_user_id, created_at
        `,
        [
          ctx.orgId,
          input.kind,
          input.key,
          nextVersion,
          input.config,
          ctx.userId,
        ],
      );
      const row = insertResult.rows.at(0);
      if (!row) {
        throw new Error("Failed to create template version");
      }
      return mapVersionRow(row);
    });
  }
  /**
   * 读取当前模板发布记录。
   *
   * @param ctx 请求上下文
   * @param input 查询条件
   * @param input.kind 模板类型
   * @param input.key 模板 key
   * @returns 发布记录或 null
   */
  async getRelease(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `
        select id, org_id, kind, key, mode, current_version, previous_version, rollout, updated_by_user_id, updated_at
        from template_releases
        where kind = $1 and key = $2
        limit 1
      `,
      [input.kind, input.key],
    );
    const row = result.rows.at(0);
    return row ? mapReleaseRow(row) : null;
  }
  /**
   * 设置模板发布模式（legacy/template）。
   *
   * @param ctx 请求上下文
   * @param input 设置入参
   * @param input.kind 模板类型
   * @param input.key 模板 key
   * @param input.mode 发布模式
   * @returns 发布记录
   */
  async setMode(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `
        insert into template_releases (org_id, kind, key, mode, updated_by_user_id, updated_at)
        values ($1, $2, $3, $4, $5, now())
        on conflict (org_id, kind, key)
        do update set mode = excluded.mode, updated_by_user_id = excluded.updated_by_user_id, updated_at = excluded.updated_at
        returning id, org_id, kind, key, mode, current_version, previous_version, rollout, updated_by_user_id, updated_at
      `,
      [ctx.orgId, input.kind, input.key, input.mode, ctx.userId],
    );
    const row = result.rows.at(0);
    if (!row) throw new Error("Failed to set template release mode");
    return mapReleaseRow(row);
  }
  /**
   * 发布指定版本为当前版本，并记录 previous_version 以支持回滚。
   *
   * 通过单事务内 SELECT FOR UPDATE + upsert 消除读-改-写竞态（TOCTOU）。
   *
   * @param ctx 请求上下文
   * @param input 发布入参
   * @param input.kind 模板类型
   * @param input.key 模板 key
   * @param input.version 版本号
   * @param input.rollout 灰度规则
   * @returns 发布记录
   */
  // eslint-disable-next-line max-lines-per-function
  async releaseVersion(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      // 锁定当前发布行，避免并发 releaseVersion 覆盖 previous_version
      const lockResult = await tx.query(
        `
          select current_version, rollout
          from template_releases
          where kind = $1 and key = $2
          for update
        `,
        [input.kind, input.key],
      );
      const existing = lockResult.rows.at(0);
      const previousVersion = existing?.current_version ?? null;
      const rollout =
        input.rollout ??
        (existing ? normalizeRollout(existing.rollout) : { type: "all" });
      const result = await tx.query(
        `
          insert into template_releases (
            org_id, kind, key, mode, current_version, previous_version, rollout, updated_by_user_id, updated_at
          )
          values ($1, $2, $3, 'template', $4, $5, $6::jsonb, $7, now())
          on conflict (org_id, kind, key)
          do update set
            mode = excluded.mode,
            current_version = excluded.current_version,
            previous_version = excluded.previous_version,
            rollout = excluded.rollout,
            updated_by_user_id = excluded.updated_by_user_id,
            updated_at = excluded.updated_at
          returning id, org_id, kind, key, mode, current_version, previous_version, rollout, updated_by_user_id, updated_at
        `,
        [
          ctx.orgId,
          input.kind,
          input.key,
          input.version,
          previousVersion,
          JSON.stringify(rollout),
          ctx.userId,
        ],
      );
      const row = result.rows.at(0);
      if (!row) throw new Error("Failed to release template version");
      return mapReleaseRow(row);
    });
  }
  /**
   * 回滚到 previous_version 或指定版本；若不可回滚则切回 legacy。
   *
   * @param ctx 请求上下文
   * @param input 回滚入参
   * @param input.kind 模板类型
   * @param input.key 模板 key
   * @param input.toVersion 回滚目标版本（可选）
   * @returns 发布记录
   */
  async rollback(ctx, input) {
    const existing = await this.getRelease(ctx, {
      kind: input.kind,
      key: input.key,
    });
    if (!existing) {
      return this.setLegacyMode(ctx, input.kind, input.key);
    }
    const toVersion = input.toVersion ?? existing.previousVersion ?? null;
    if (toVersion === null) {
      return this.setLegacyMode(ctx, input.kind, input.key);
    }
    return this.updateReleaseToVersion(
      ctx,
      { kind: input.kind, key: input.key },
      toVersion,
      existing.currentVersion,
    );
  }
  /**
   * 解析本次请求应使用 legacy 还是模板配置。
   *
   * @param ctx 请求上下文
   * @param input 解析入参
   * @param input.kind 模板类型
   * @param input.key 模板 key
   * @param input.entityId 用于灰度分桶的实体 ID（可选）
   * @returns 解析结果
   */
  async resolve(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const release = await this.getRelease(ctx, {
      kind: input.kind,
      key: input.key,
    });
    if (release?.mode !== "template") return { mode: "legacy", used: false };
    if (release.currentVersion === null) {
      return {
        mode: "template",
        used: false,
        reason: "missing_current_version",
      };
    }
    if (!shouldUseTemplateByRollout(release.rollout, input.entityId)) {
      return { mode: "template", used: false, reason: "rollout" };
    }
    const versionResult = await tenantDb.query(
      `
        select config
        from template_versions
        where kind = $1 and key = $2 and version = $3
        limit 1
      `,
      [input.kind, input.key, release.currentVersion],
    );
    const row = versionResult.rows.at(0);
    if (!row)
      return { mode: "template", used: false, reason: "missing_version_row" };
    return {
      mode: "template",
      used: true,
      version: release.currentVersion,
      config: normalizeConfig(row.config),
    };
  }
};
TemplatesService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __metadata("design:paramtypes", [Pool]),
  ],
  TemplatesService,
);
export { TemplatesService };
//# sourceMappingURL=templates.service.js.map
