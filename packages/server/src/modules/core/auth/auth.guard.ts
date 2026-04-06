import {
  CanActivate,
  Inject,
  Injectable,
  UnauthorizedException,
  type ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Pool } from "pg";

import { IS_PUBLIC_KEY, REQUIRED_ROLES_KEY } from "./auth.decorators";
import { hasRequiredRole, parseRole, type Role } from "./roles";
import {
  parseVerifiedRequestAuthInputFromHeaders,
  readAuthConfigFromEnv,
  type RequestAuthInput,
  type RequestContext,
} from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { isUuid } from "../tenancy/uuid";

type HttpRequest = {
  headers?: Record<string, unknown>;
  requestContext?: RequestContext;
  requestAuthInput?: RequestAuthInput;
};

/**
 * 统一鉴权 + RBAC Guard。
 *
 * 说明：
 * - 若标记 @Public 则跳过
 * - 否则要求鉴权输入存在（由 RequestContextInterceptor 或 header 解析注入）
 * - requestContext 以 DB 结果为准，由本 Guard 写入
 * - 若声明 @RequireRoles 则执行 RBAC 校验（高权限包含低权限）
 */
@Injectable()
export class AuthGuard implements CanActivate {
  /**
   * 创建 Guard。
   *
   * @param reflector Reflector
   * @param pool PostgreSQL 连接池
   */
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(Pool) private readonly pool: Pool,
  ) {}

  /**
   * 是否允许当前请求进入路由处理器。
   *
   * @param context 执行上下文
   * @returns 是否允许
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<HttpRequest>();
    const input =
      req.requestAuthInput ??
      parseVerifiedRequestAuthInputFromHeaders(req.headers, readAuthConfigFromEnv());
    if (!input) {
      throw new UnauthorizedException(
        "Missing authorization",
      );
    }

    if (!isUuid(input.orgId) || !isUuid(input.userId)) {
      throw new UnauthorizedException("Invalid auth context");
    }

    const tenantDb = createTenantDb(this.pool, input.orgId, input.userId);
    const userResult = await tenantDb.query<{
      id: string;
      role: string;
      status: string;
    }>("select id, role, status from users where id = $1 limit 1", [input.userId]);

    if (userResult.rows.length === 0) {
      throw new UnauthorizedException("User not found in organization");
    }
    const user = userResult.rows[0];

    const role = parseRole(user.role);
    if (!role) {
      throw new ForbiddenException("Invalid role");
    }
    if (user.status !== "active") {
      throw new ForbiddenException("Inactive user");
    }

    req.requestContext = {
      orgId: input.orgId,
      userId: input.userId,
      role,
    };

    const requiredRoles =
      this.reflector.getAllAndOverride<Role[] | undefined>(REQUIRED_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!hasRequiredRole(role, requiredRoles)) {
      throw new ForbiddenException("Insufficient role");
    }

    return true;
  }
}
