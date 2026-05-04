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
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { verifyAppUserJwt, readJwtSecret } from "./appUserAuth.service";
/**
 * AppUser Auth Guard。
 *
 * - 检查 Authorization header 中 JWT
 * - 解析 payload.type === "app_user"
 * - 挂载 req.appUserContext = { appUserId }
 * - 与后台 AuthGuard 共存（按 token type 区分）
 */
let AppUserAuthGuard = class AppUserAuthGuard {
  /**
   * 验证请求中的 AppUser JWT。
   * @param context 执行上下文
   * @returns 是否通过验证
   */
  canActivate(context) {
    const req = context.switchToHttp().getRequest();
    if (req.requestContext) return true;
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
};
AppUserAuthGuard = __decorate([Injectable()], AppUserAuthGuard);
export { AppUserAuthGuard };
function parseBearerToken(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("Bearer ")) return null;
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}
//# sourceMappingURL=appUserAuth.guard.js.map
