import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { loadEnv } from "./config/env";
import { AppModule } from "./app.module";

/**
 * 启动 HTTP 服务。
 *
 * @returns 启动结果
 */
async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["log", "warn", "error"],
  });

  // P1-2: Helmet — 安全 HTTP 头
  app.use(helmet());

  // P1-2: CORS 配置
  app.enableCors({
    origin: env.corsOrigins || false,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  });

  // P1-2: Body 大小限制（JSON 最大 15MB 以支持 base64 文件上传）
  app.useBodyParser("json", { limit: "15mb" });

  // P2-2: 生产环境 insecure headers 拒绝启动
  if (process.env.NODE_ENV === "production") {
    const insecure = process.env.AUTH_ALLOW_INSECURE_HEADERS;
    if (insecure === "1" || insecure === "true" || insecure === "yes") {
      // eslint-disable-next-line no-console
      console.error(
        "[SECURITY] AUTH_ALLOW_INSECURE_HEADERS is enabled in production — refusing to start.",
      );
      process.exit(1);
    }
  }

  await app.listen(env.port);
}

await bootstrap();
