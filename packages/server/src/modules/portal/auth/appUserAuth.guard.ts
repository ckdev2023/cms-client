import {
  CanActivate,
  Injectable,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import { verifyAppUserJwt, readJwtSecret } from "./appUserAuth.service";
import type { AppUserContext } from "./appUserAuth.service";

type HttpRequest = {
  headers?: Record<string, unknown>;
  appUserContext?: AppUserContext;
};

/**
 * AppUser Auth Guard。
 *
 * - 检查 Authorization header 中 JWT
 * - 解析 payload.type === "app_user"
 * - 挂载 req.appUserContext = { appUserId }
 * - 与后台 AuthGuard 共存（按 token type 区分）
 */
@Injectable()
export class AppUserAuthGuard implements CanActivate {
  /**
   * 验证请求中的 AppUser JWT。
   * @param context 执行上下文
   * @returns 是否通过验证
   */
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<HttpRequest>();
    const authHeader =
      typeof req.headers?.authorization === "string"
        ? req.headers.authorization
        : typeof req.headers?.Authorization === "string"
          ? req.headers.Authorization
          : null;

    if (!authHeader) throw new UnauthorizedException("Missing authorization");

    const token = parseBearerToken(authHeader);
    if (!token) throw new UnauthorizedException("Invalid authorization");

    const secret = readJwtSecret();
    const appUserCtx = verifyAppUserJwt(token, secret);
    if (!appUserCtx)
      throw new UnauthorizedException("Invalid or expired token");

    req.appUserContext = appUserCtx;
    return true;
  }
}

function parseBearerToken(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("Bearer ")) return null;
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}
