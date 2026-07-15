/**
 * 案件访问守门服务（拆分批次 S2）。
 *
 * 从 `CasesService` 抽出 `get` / `assertCanEditCase` 两个被 20+ 模块复用的
 * 守门方法：跨模块消费方（controller 权限断言、billing 催收等）应注入本服务，
 * 而不是整个 CasesService 门面。`CasesService` 在过渡期内部委托本服务，
 * 行为与既有实现完全一致。
 */
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Pool } from "pg";

import type { Case } from "../../model/coreEntities";
import { PermissionsService } from "../../auth/permissions.service";
import type { RequestContext } from "../../tenancy/requestContext";
import { createTenantDb } from "../../tenancy/tenantDb";
import { CASE_COLS } from "../cases.service.sql";
import { mapCaseRow, type CaseQueryRow } from "../cases.service.row-mappers";

/** 案件访问守门服务：按 ID 读取 + 编辑权限断言。 */
@Injectable()
export class CaseAccessService {
  /**
   * 创建案件访问守门服务。
   * @param pool 连接池
   * @param permissionsService 权限判定服务（缺省时 assertCanEditCase 拒绝执行）
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Optional()
    @Inject(PermissionsService)
    private readonly permissionsService?: PermissionsService,
  ) {}

  /**
   * 根据 ID 获取案件详情（过滤已软删除）。
   * @param ctx 请求上下文
   * @param id 案件 ID
   * @returns Case 或 null
   */
  async get(ctx: RequestContext, id: string): Promise<Case | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<CaseQueryRow>(
      `
        select ${CASE_COLS}
        from cases
        where id = $1 and coalesce(metadata->>'_status', '') is distinct from 'deleted'
        limit 1
      `,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapCaseRow(row) : null;
  }

  /**
   * 断言当前用户可编辑指定案件，否则抛出异常。
   *
   * case 不存在时抛 NotFoundException，无权限时抛 ForbiddenException。
   * @param ctx 请求上下文
   * @param caseId 案件 ID
   */
  async assertCanEditCase(ctx: RequestContext, caseId: string): Promise<void> {
    if (!this.permissionsService) {
      throw new Error("PermissionsService is required for assertCanEditCase");
    }
    const caseEntity = await this.get(ctx, caseId);
    if (!caseEntity) throw new NotFoundException("Case not found");
    if (
      !this.permissionsService.canEditCase(
        ctx.userId,
        ctx.role,
        ctx.groupId,
        caseEntity,
      )
    ) {
      throw new ForbiddenException("Insufficient permissions to edit case");
    }
  }
}
