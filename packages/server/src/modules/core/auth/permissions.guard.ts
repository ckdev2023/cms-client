import {
  CanActivate,
  ForbiddenException,
  Inject,
  Injectable,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { IS_PUBLIC_KEY, REQUIRED_PERMISSIONS_KEY } from "./auth.decorators";
import { EffectivePermissionsService } from "./effective-permissions.service";
import type { RequestContext } from "../tenancy/requestContext";

type HttpRequest = {
  requestContext?: RequestContext;
};

/**
 * 権限コードベースの Guard。
 *
 * `@RequirePermission(...)` が付与されたルートで有効。
 * AuthGuard（APP_GUARD）の後に実行され、requestContext が既にセットされている前提。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  /**
   * Guard を生成する。
   *
   * @param reflector - Reflector
   * @param effectivePermissions - 有効権限解析サービス
   */
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(EffectivePermissionsService)
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  /**
   * ルートアクセスの可否を判定する。
   *
   * @param context - 実行コンテキスト
   * @returns アクセス可否
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<
      string[] | undefined
    >(REQUIRED_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const req = context.switchToHttp().getRequest<HttpRequest>();
    const ctx = req.requestContext;
    if (!ctx) throw new ForbiddenException("Missing request context");

    const userPermissions = await this.effectivePermissions.resolve(
      ctx.orgId,
      ctx.userId,
    );

    const hasAll = requiredPermissions.every((p) => userPermissions.has(p));
    if (!hasAll) throw new ForbiddenException("Insufficient permissions");

    return true;
  }
}
