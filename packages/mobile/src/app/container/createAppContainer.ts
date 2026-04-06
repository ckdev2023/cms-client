import { createHomeRepository } from "@data/home/createHomeRepository";
import { createAuthRepository } from "@data/auth/createAuthRepository";
import { createCaseRepository } from "@data/case/createCaseRepository";
import { createInboxRepository } from "@data/inbox/createInboxRepository";
import { createDocumentRepository } from "@data/documents/createDocumentRepository";
import { createProfileRepository } from "@data/profile/createProfileRepository";
import { HttpClient } from "@infra/http/HttpClient";
import { ConsoleLogger } from "@infra/log/ConsoleLogger";
import { MemoryStorage } from "@infra/storage/MemoryStorage";

import type { AppContainer } from "./AppContainer";

/** API 基础 URL（开发环境默认值）。 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * 创建应用容器（依赖组装）。
 *
 * 该函数是“组装层”，负责把 infra/data 的实现装配成可供 app/features 使用的依赖集合：
 * - infra：HttpClient / Logger / Storage 等通用能力
 * - data：Repository 的具体实现
 *
 * @returns 应用容器实例
 */
export function createAppContainer(): AppContainer {
  const logger = new ConsoleLogger();
  const httpClient = new HttpClient();
  const storage = new MemoryStorage();
  const baseUrl = API_BASE_URL;

  return {
    logger,
    httpClient,
    storage,
    homeRepository: createHomeRepository({ httpClient }),
    authRepository: createAuthRepository({ httpClient, storage, baseUrl }),
    caseRepository: createCaseRepository({ httpClient, storage, baseUrl }),
    inboxRepository: createInboxRepository({ httpClient, storage, baseUrl }),
    documentRepository: createDocumentRepository({
      httpClient,
      storage,
      baseUrl,
    }),
    profileRepository: createProfileRepository({
      httpClient,
      storage,
      baseUrl,
    }),
  };
}
