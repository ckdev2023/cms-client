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
  Inject,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Pool } from "pg";
import { IS_PUBLIC_KEY, REQUIRED_ROLES_KEY } from "./auth.decorators";
import { hasRequiredRole, parseRole } from "./roles";
import {
  parseVerifiedRequestAuthInputFromHeaders,
  readAuthConfigFromEnv,
} from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { isUuid } from "../tenancy/uuid";
/**
 * 统一鉴权 + RBAC Guard。
 *
 * 说明：
 * - 若标记 @Public 则跳过
 * - 否则要求鉴权输入存在（由 RequestContextInterceptor 或 header 解析注入）
 * - requestContext 以 DB 结果为准，由本 Guard 写入
 * - 若声明 @RequireRoles 则执行 RBAC 校验（高权限包含低权限）
 */
let AuthGuard = class AuthGuard {
  reflector;
  pool;
  /**
   * 创建 Guard。
   *
   * @param reflector Reflector
   * @param pool PostgreSQL 连接池
   */
  constructor(reflector, pool) {
    this.reflector = reflector;
    this.pool = pool;
  }
  /**
   * 是否允许当前请求进入路由处理器。
   *
   * @param context 执行上下文
   * @returns 是否允许
   */
  async canActivate(context) {
    const req = context.switchToHttp().getRequest();
    const isPublicRoute = this.isPublicRoute(context);
    const input = this.readOptionalRequestAuthInput(req);
    if (!input && isPublicRoute) return true;
    const verifiedInput = input ?? this.readRequestAuthInput(req);
    const role = await this.resolveActiveRole(verifiedInput);
    req.requestContext = {
      orgId: verifiedInput.orgId,
      userId: verifiedInput.userId,
      role,
      ...(verifiedInput.groupId ? { groupId: verifiedInput.groupId } : {}),
    };
    if (isPublicRoute) return true;
    const requiredRoles =
      this.reflector.getAllAndOverride(REQUIRED_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (!hasRequiredRole(role, requiredRoles)) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
  isPublicRoute(context) {
    return this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
  readOptionalRequestAuthInput(req) {
    const input =
      req.requestAuthInput ??
      parseVerifiedRequestAuthInputFromHeaders(
        req.headers,
        readAuthConfigFromEnv(),
      );
    if (!input) return undefined;
    if (!isUuid(input.orgId) || !isUuid(input.userId)) {
      throw new UnauthorizedException("Invalid auth context");
    }
    return input;
  }
  readRequestAuthInput(req) {
    const input = this.readOptionalRequestAuthInput(req);
    if (!input) {
      throw new UnauthorizedException("Missing authorization");
    }
    return input;
  }
  async resolveActiveRole(input) {
    const tenantDb = createTenantDb(this.pool, input.orgId, input.userId);
    const userResult = await tenantDb.query(
      "select id, role, status from users where id = $1 limit 1",
      [input.userId],
    );
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
    return role;
  }
};
AuthGuard = __decorate(
  [
    Injectable(),
    __param(0, Inject(Reflector)),
    __param(1, Inject(Pool)),
    __metadata("design:paramtypes", [Reflector, Pool]),
  ],
  AuthGuard,
);
export { AuthGuard };
//# sourceMappingURL=auth.guard.js.map
