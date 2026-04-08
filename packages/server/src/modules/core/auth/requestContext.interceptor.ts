import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";

import {
  parseVerifiedRequestAuthInputFromHeaders,
  readAuthConfigFromEnv,
} from "../tenancy/requestContext";
import type {
  RequestAuthInput,
  RequestContext,
} from "../tenancy/requestContext";

type HttpRequest = {
  headers: Record<string, unknown>;
  requestContext?: RequestContext;
  requestAuthInput?: RequestAuthInput;
};

/**
 * 请求上下文拦截器：把鉴权输入从请求头解析并挂载到 request 上。
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  /**
   * 注入 requestAuthInput。
   *
   * @param context 执行上下文
   * @param next 后续处理器
   * @returns Observable
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<HttpRequest>();

    const authInput = parseVerifiedRequestAuthInputFromHeaders(
      req.headers,
      readAuthConfigFromEnv(),
    );
    if (authInput) req.requestAuthInput = authInput;

    return next.handle();
  }
}
