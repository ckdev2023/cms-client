import { Inject, Injectable } from "@nestjs/common";

import type { RequestContext } from "../tenancy/requestContext";
import { TimelineService } from "../timeline/timeline.service";
import { ValidationRunsService } from "./validationRuns.service";

/**
 * 写端点完成后异步触发 validation run 重算。
 *
 * 使用 `setImmediate` 让当前事务/微任务排空后再执行；
 * 失败仅写 timeline，不影响主路径。
 */
@Injectable()
export class ValidationAutoRunService {
  /**
   * 注入依赖。
   * @param runs 校验运行服务
   * @param timeline 时间线服务
   */
  constructor(
    @Inject(ValidationRunsService)
    private readonly runs: ValidationRunsService,
    @Inject(TimelineService)
    private readonly timeline: TimelineService,
  ) {}

  /**
   * 异步调度一次 validation run。
   *
   * @param ctx 请求上下文
   * @param caseId 案件 ID
   * @param trigger 触发来源标识，如 `generated_document.finalize`
   */
  schedule(ctx: RequestContext, caseId: string, trigger: string): void {
    setImmediate(() => {
      void this.runAndCatch(ctx, caseId, trigger);
    });
  }

  private async runAndCatch(
    ctx: RequestContext,
    caseId: string,
    trigger: string,
  ): Promise<void> {
    try {
      await this.runs.create(ctx, {
        caseId,
        rulesetRef: {
          gate: "submission_readiness",
          source: "auto_event",
          trigger,
          version: 1,
        },
      });
    } catch (err: unknown) {
      try {
        await this.timeline.write(ctx, {
          entityType: "case",
          entityId: caseId,
          action: "validation_run.auto_failed",
          payload: {
            trigger,
            message: err instanceof Error ? err.message : String(err),
          },
        });
      } catch {
        // timeline 写入失败也不能让进程 crash
      }
    }
  }
}
