import type { HttpClient } from "@infra/http/HttpClient";
import type { Logger } from "@infra/log/Logger";
import type { KVStorage } from "@infra/storage/KVStorage";

import type { HomeRepository } from "@domain/home/HomeRepository";
import type { AuthRepository } from "@domain/auth/AuthRepository";
import type { CaseRepository } from "@domain/case/CaseRepository";
import type { InboxRepository } from "@domain/inbox/InboxRepository";
import type { DocumentRepository } from "@domain/documents/DocumentRepository";
import type { ProfileRepository } from "@domain/profile/ProfileRepository";

/**
 * 应用容器（依赖注入集合）。
 *
 * 说明：
 * - app/features 通过 useAppContainer 获取依赖
 * - 容器实例在 app 组装层创建（createAppContainer）
 */
export type AppContainer = {
  /** 日志能力。 */
  logger: Logger;
  /** HTTP 客户端。 */
  httpClient: HttpClient;
  /** KV 存储能力。 */
  storage: KVStorage;
  /** Home 领域仓库。 */
  homeRepository: HomeRepository;
  /** Auth 领域仓库。 */
  authRepository: AuthRepository;
  /** Case 领域仓库。 */
  caseRepository: CaseRepository;
  /** Inbox 领域仓库。 */
  inboxRepository: InboxRepository;
  /** Document 领域仓库。 */
  documentRepository: DocumentRepository;
  /** Profile 领域仓库。 */
  profileRepository: ProfileRepository;
};
