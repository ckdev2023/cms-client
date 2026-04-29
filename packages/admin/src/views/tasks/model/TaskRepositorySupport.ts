import { getAdminAccessToken } from "../../../auth/model/adminSession";
import {
  createRepositoryRuntime,
  RepositoryError,
  requestAndAdapt,
  type RepositoryRuntime,
} from "../../../shared/api/repositoryRuntime";

/**
 * 创建任务仓储时可注入的运行时配置。
 */
export interface TaskRepositoryFactoryInput {
  /** 请求实现，测试中可注入 stub。 */
  request?: typeof fetch;
  /** 读取管理员访问令牌的方法。 */
  getToken?: () => string | null;
  /** 任务接口的基础路径。 */
  apiPath?: string;
  /** 提醒接口的基础路径。 */
  remindersApiPath?: string;
}

/**
 * 任务仓储在运行时使用的上下文。
 */
export interface TaskRepositoryRuntime extends RepositoryRuntime {
  /** 提醒列表请求使用的接口路径。 */
  remindersApiPath: string;
}

export const TaskRepositoryError = RepositoryError;

/**
 * 基于默认管理端认证能力创建任务仓储运行时上下文。
 *
 * @param input - 仓储初始化配置，可覆盖请求实现、令牌来源与接口路径。
 * @returns 供任务仓储读写 API 使用的完整运行时上下文。
 */
export function createRuntime(
  input: TaskRepositoryFactoryInput = {},
): TaskRepositoryRuntime {
  const apiPath = input.apiPath ?? "/api/tasks";

  return {
    ...createRepositoryRuntime({
      request: input.request,
      getToken: input.getToken ?? getAdminAccessToken,
      apiPath,
      writeErrorCode: "TASK_WRITE_ERROR",
      entityLabel: "Task",
      errorName: "TaskRepositoryError",
    }),
    remindersApiPath:
      input.remindersApiPath ?? apiPath.replace(/\/tasks\/?$/, "/reminders"),
  };
}

export { requestAndAdapt };
