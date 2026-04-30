import { Inject } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
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
  type AffectedCaseRow,
  type DocumentAsset,
  type DocumentAssetListInput,
  type DocumentAssetQueryRow,
  type SharedExpiryRiskResult,
  type UpsertAssetInput,
} from "./documentAssets.shared";

/** DocumentAsset 只读查询服务（写路径仅由 upload 内部触发）。 */
@Injectable()
export class DocumentAssetsService {
  /**
   * 构造 DocumentAssetsService。
   * @param pool PostgreSQL 连接池
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * 查询资料资产列表（含派生字段：最新版本过期日期、引用案件数）。
   * @param ctx 请求上下文
   * @param input 查询参数
   * @returns 资产列表与总数
   */
  async list(
    ctx: RequestContext,
    input: DocumentAssetListInput,
  ): Promise<{ items: DocumentAsset[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const { where, params } = buildAssetListFilters(input);
    const whereClause = where.join(" AND ");
    const limit = input.limit ?? 50;

    const countSql = `SELECT COUNT(*) AS cnt FROM document_assets da WHERE ${whereClause}`;
    const countResult = await tenantDb.query<{ cnt: string }>(countSql, params);
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

    const listResult = await tenantDb.query<DocumentAssetQueryRow>(
      listSql,
      listParams,
    );

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
  async upsertByOwnerAndMaterial(
    ctx: RequestContext,
    input: Omit<UpsertAssetInput, "orgId">,
  ): Promise<string> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const { insertSql, fallbackSql, params } = buildUpsertAssetSql({
      ...input,
      orgId: ctx.orgId,
    });

    return tenantDb.transaction(async (tx) => {
      const insertResult = await tx.query<{ id: string }>(insertSql, params);
      if (insertResult.rows.length > 0) {
        return insertResult.rows[0].id;
      }
      const selectResult = await tx.query<{ id: string }>(fallbackSql, params);
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
  async getSharedExpiryRisk(
    ctx: RequestContext,
    assetId: string,
  ): Promise<SharedExpiryRiskResult | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const existsResult = await tenantDb.query<{ id: string }>(
      "SELECT id FROM document_assets WHERE id = $1 AND active_flag = true",
      [assetId],
    );
    if (existsResult.rows.length === 0) return null;

    const expiryResult = await tenantDb.query<{ expiry_date: unknown }>(
      LATEST_EXPIRY_SQL,
      [assetId],
    );
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

    const casesResult = await tenantDb.query<AffectedCaseRow>(
      AFFECTED_CASES_SQL,
      [assetId],
    );

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
  async get(ctx: RequestContext, id: string): Promise<DocumentAsset | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const sql = `
      SELECT
        ${ASSET_SELECT_SQL},
        ${ASSET_DERIVED_SQL}
      FROM document_assets da
      WHERE da.id = $1 AND da.active_flag = true
      GROUP BY da.id
    `;

    const result = await tenantDb.query<DocumentAssetQueryRow>(sql, [id]);
    if (result.rows.length === 0) return null;
    return mapDocumentAssetRow(result.rows[0]);
  }
}
