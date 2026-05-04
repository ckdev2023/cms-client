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
import { Inject } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { createTenantDb } from "../tenancy/tenantDb";
import {
  AFFECTED_CASES_SQL,
  ASSET_DERIVED_SQL,
  ASSET_SELECT_SQL,
  LATEST_EXPIRY_SQL,
  buildAssetListFilters,
  buildUpsertAssetSql,
  computeExpiryRisk,
  mapAffectedCaseRow,
  mapDocumentAssetRow,
} from "./documentAssets.shared";
/** DocumentAsset 只读查询服务（写路径仅由 upload 内部触发）。 */
let DocumentAssetsService = class DocumentAssetsService {
  pool;
  /**
   * 构造 DocumentAssetsService。
   * @param pool PostgreSQL 连接池
   */
  constructor(pool) {
    this.pool = pool;
  }
  /**
   * 查询资料资产列表（含派生字段：最新版本过期日期、引用案件数）。
   * @param ctx 请求上下文
   * @param input 查询参数
   * @returns 资产列表与总数
   */
  async list(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const { where, params } = buildAssetListFilters(input);
    const whereClause = where.join(" AND ");
    const limit = input.limit ?? 50;
    const countSql = `SELECT COUNT(*) AS cnt FROM document_assets da WHERE ${whereClause}`;
    const countResult = await tenantDb.query(countSql, params);
    const total = Number(countResult.rows[0]?.cnt ?? 0);
    const onlyExpiredHaving = input.onlyExpired
      ? `HAVING (
          SELECT df_exp.expiry_date
          FROM document_files df_exp
          WHERE df_exp.asset_id = da.id
          ORDER BY df_exp.version_no DESC
          LIMIT 1
        ) < CURRENT_DATE`
      : "";
    const listParams = [...params, limit];
    const listSql = `
      SELECT
        ${ASSET_SELECT_SQL},
        ${ASSET_DERIVED_SQL}
      FROM document_assets da
      WHERE ${whereClause}
      GROUP BY da.id
      ${onlyExpiredHaving}
      ORDER BY da.created_at DESC, da.id DESC
      LIMIT $${String(listParams.length)}
    `;
    const listResult = await tenantDb.query(listSql, listParams);
    return {
      items: listResult.rows.map(mapDocumentAssetRow),
      total: input.onlyExpired ? listResult.rows.length : total,
    };
  }
  /**
   * 按 owner + material 幂等 upsert asset（ON CONFLICT DO NOTHING + fallback SELECT）。
   *
   * 用于 D3（upload 事务内）：并发 upload 同一 owner+material 只产生一条 asset。
   * 必须在调用方的事务内执行（传入 tx）。
   *
   * @param ctx 请求上下文
   * @param input upsert 输入
   * @returns asset id
   */
  async upsertByOwnerAndMaterial(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const { insertSql, fallbackSql, params } = buildUpsertAssetSql({
      ...input,
      orgId: ctx.orgId,
    });
    return tenantDb.transaction(async (tx) => {
      const insertResult = await tx.query(insertSql, params);
      if (insertResult.rows.length > 0) {
        return insertResult.rows[0].id;
      }
      const selectResult = await tx.query(fallbackSql, params);
      if (selectResult.rows.length === 0) {
        throw new Error(
          "upsertByOwnerAndMaterial: neither INSERT nor SELECT returned a row",
        );
      }
      return selectResult.rows[0].id;
    });
  }
  /**
   * 取 asset 最新 file 版本的 expiry_date 与 now 比较，join 受影响案件清单 + 建议码。
   * @param ctx 请求上下文
   * @param assetId 资产 ID
   * @returns 共享过期风险数据，asset 不存在时返回 null
   */
  async getSharedExpiryRisk(ctx, assetId) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const existsResult = await tenantDb.query(
      "SELECT id FROM document_assets WHERE id = $1 AND active_flag = true",
      [assetId],
    );
    if (existsResult.rows.length === 0) return null;
    const expiryResult = await tenantDb.query(LATEST_EXPIRY_SQL, [assetId]);
    const rawExpiry = expiryResult.rows[0]?.expiry_date ?? null;
    const expiryDateStr =
      rawExpiry === null
        ? null
        : typeof rawExpiry === "string"
          ? rawExpiry
          : rawExpiry instanceof Date
            ? rawExpiry.toISOString().slice(0, 10)
            : null;
    const { riskStatus, daysUntilExpiry, suggestions } =
      computeExpiryRisk(expiryDateStr);
    const casesResult = await tenantDb.query(AFFECTED_CASES_SQL, [assetId]);
    return {
      assetId,
      latestVersionExpiryDate: expiryDateStr,
      riskStatus,
      daysUntilExpiry,
      suggestions,
      affectedCases: casesResult.rows.map(mapAffectedCaseRow),
    };
  }
  /**
   * 按 ID 获取单个资料资产。
   * @param ctx 请求上下文
   * @param id 资产 ID
   * @returns 资产或 null
   */
  async get(ctx, id) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const sql = `
      SELECT
        ${ASSET_SELECT_SQL},
        ${ASSET_DERIVED_SQL}
      FROM document_assets da
      WHERE da.id = $1 AND da.active_flag = true
      GROUP BY da.id
    `;
    const result = await tenantDb.query(sql, [id]);
    if (result.rows.length === 0) return null;
    return mapDocumentAssetRow(result.rows[0]);
  }
};
DocumentAssetsService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __metadata("design:paramtypes", [Pool]),
  ],
  DocumentAssetsService,
);
export { DocumentAssetsService };
//# sourceMappingURL=documentAssets.service.js.map
