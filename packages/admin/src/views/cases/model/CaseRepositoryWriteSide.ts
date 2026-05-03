/**
 * CaseRepository 写入子流程：communicationLog / generatedDocument / reminder。
 *
 * 这些 endpoint 不在 cases/* 路径下，但通过 cases 仓储统一暴露：
 * - `/api/communication-logs`（沟通记录）
 * - `/api/generated-documents`（生成文書）
 * - `/api/reminders`（期限/提醒）
 *
 * URL 由 builder 从 `runtime.apiPath`（默认 `/api/cases`）派生。
 */

import {
  buildCommunicationLogsPostUrl,
  buildCreateCommunicationLogPayload,
  type CommunicationLogCreateInput,
} from "./CaseAdapterMessageWriteBuilders";
import {
  buildCreateGeneratedDocumentPayload,
  buildGeneratedDocumentsPostUrl,
  type GeneratedDocumentCreateInput,
} from "./CaseAdapterGeneratedDocumentWriteBuilders";
import {
  buildCreateReminderPayload,
  buildRemindersPostUrl,
  type ReminderCreateInput,
} from "./CaseAdapterReminderWriteBuilders";
import {
  buildCreateTaskPayload,
  buildTasksPostUrl,
  type TaskCreateInput,
} from "./CaseAdapterTaskWriteBuilders";
import {
  requestAndAdapt,
  type CaseRepositoryRuntime,
} from "./CaseRepositorySupport";

/**
 * 写入响应只关心 `id`；其他字段保留原 DTO 形态。
 */
export interface WriteResultWithId {
  /** 服务端返回的资源 ID。 */
  id: string;
  /** 透传响应中可能携带的其他字段，便于上层后续扩展。 */
  [extra: string]: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function adaptWriteResult(value: unknown): WriteResultWithId | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = typeof record.id === "string" ? record.id : "";
  if (!id) return null;
  return record as WriteResultWithId;
}

/**
 * 创建 `createCommunicationLog` 写入函数。
 *
 * @param runtime - 案件仓储运行时
 * @returns 发起 `POST /communication-logs` 的函数
 */
export function createCreateCommunicationLog(runtime: CaseRepositoryRuntime) {
  return async (
    input: CommunicationLogCreateInput,
  ): Promise<WriteResultWithId> =>
    requestAndAdapt({
      runtime,
      url: buildCommunicationLogsPostUrl(runtime.apiPath),
      method: "POST",
      body: buildCreateCommunicationLogPayload(input),
      adapt: adaptWriteResult,
      errorMessage: "Invalid create communication log response",
    });
}

/**
 * 创建 `createGeneratedDocument` 写入函数。
 *
 * @param runtime - 案件仓储运行时
 * @returns 发起 `POST /generated-documents` 的函数
 */
export function createCreateGeneratedDocument(runtime: CaseRepositoryRuntime) {
  return async (
    input: GeneratedDocumentCreateInput,
  ): Promise<WriteResultWithId> =>
    requestAndAdapt({
      runtime,
      url: buildGeneratedDocumentsPostUrl(runtime.apiPath),
      method: "POST",
      body: buildCreateGeneratedDocumentPayload(input),
      adapt: adaptWriteResult,
      errorMessage: "Invalid create generated document response",
    });
}

/**
 * 创建 `createReminder` 写入函数。
 *
 * @param runtime - 案件仓储运行时
 * @returns 发起 `POST /reminders` 的函数
 */
export function createCreateReminder(runtime: CaseRepositoryRuntime) {
  return async (input: ReminderCreateInput): Promise<WriteResultWithId> =>
    requestAndAdapt({
      runtime,
      url: buildRemindersPostUrl(runtime.apiPath),
      method: "POST",
      body: buildCreateReminderPayload(input),
      adapt: adaptWriteResult,
      errorMessage: "Invalid create reminder response",
    });
}

/**
 * 创建 `createTask` 写入函数。
 *
 * @param runtime - 案件仓储运行时
 * @returns 发起 `POST /tasks` 的函数
 */
export function createCreateTask(runtime: CaseRepositoryRuntime) {
  return async (input: TaskCreateInput): Promise<WriteResultWithId> =>
    requestAndAdapt({
      runtime,
      url: buildTasksPostUrl(runtime.apiPath),
      method: "POST",
      body: buildCreateTaskPayload(input),
      adapt: adaptWriteResult,
      errorMessage: "Invalid create task response",
    });
}

function buildTaskCompleteUrl(casesApiPath: string, taskId: string): string {
  return casesApiPath.replace(/\/cases\/?$/, "") + `/tasks/${taskId}/complete`;
}

/**
 * 创建 `completeTask` 写入函数。
 *
 * @param runtime - 案件仓储运行时
 * @returns 发起 `POST /tasks/:id/complete` 的函数
 */
export function createCompleteTask(runtime: CaseRepositoryRuntime) {
  return async (taskId: string): Promise<WriteResultWithId> =>
    requestAndAdapt({
      runtime,
      url: buildTaskCompleteUrl(runtime.apiPath, taskId),
      method: "POST",
      adapt: adaptWriteResult,
      errorMessage: "Invalid complete task response",
    });
}
