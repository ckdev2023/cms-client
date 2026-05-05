/**
 * `cases.service` 内部模块共享的类型与注入令牌。
 *
 * 抽离这层是为了避免 `cases.service.ts` 与 `cases.service.transition-gates.ts`
 * 之间形成 import 循环 — transition-gates 只需要 `TemplatesResolver` 类型，
 * 而 `TemplatesResolver` 与 `TEMPLATES_RESOLVER` 注入令牌的真相源放在这里。
 */
import type { RequestContext } from "../tenancy/requestContext";

/** TemplatesService 的最小接口，避免 core → templates 直接依赖。 */
export type TemplatesResolver = {
  resolve(
    ctx: RequestContext,
    input: { kind: string; key: string; entityId?: string },
  ): Promise<
    | { mode: "legacy"; used: false }
    | { mode: "template"; used: false; reason: string }
    | {
        mode: "template";
        used: true;
        version: number;
        config: Record<string, unknown>;
      }
  >;
};

/** TemplatesResolver 注入令牌。 */
export const TEMPLATES_RESOLVER = Symbol("TEMPLATES_RESOLVER");
