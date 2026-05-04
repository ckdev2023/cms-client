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
import { Injectable } from "@nestjs/common";
import {
  parseVerifiedRequestAuthInputFromHeaders,
  readAuthConfigFromEnv,
} from "../tenancy/requestContext";
/**
 * 请求上下文拦截器：把鉴权输入从请求头解析并挂载到 request 上。
 */
let RequestContextInterceptor = class RequestContextInterceptor {
  /**
   * 注入 requestAuthInput。
   *
   * @param context 执行上下文
   * @param next 后续处理器
   * @returns Observable
   */
  intercept(context, next) {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const authInput = parseVerifiedRequestAuthInputFromHeaders(
      req.headers,
      readAuthConfigFromEnv(),
    );
    if (authInput) req.requestAuthInput = authInput;
    return next.handle();
  }
};
RequestContextInterceptor = __decorate(
  [Injectable()],
  RequestContextInterceptor,
);
export { RequestContextInterceptor };
//# sourceMappingURL=requestContext.interceptor.js.map
