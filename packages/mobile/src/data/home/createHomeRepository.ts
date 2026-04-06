import type { HomeRepository } from "@domain/home/HomeRepository";
import type { Todo } from "@domain/home/Todo";
import type { HttpClient } from "@infra/http/HttpClient";

/**
 * 创建 HomeRepository 的数据层实现。
 *
 * 约束：
 * - data 层仅实现 domain 层定义的接口
 * - 通过依赖注入获得 HttpClient，便于测试替换
 *
 * @param deps 依赖集合
 * @param deps.httpClient HTTP 客户端
 * @returns HomeRepository 实例
 */
export function createHomeRepository(deps: {
  httpClient: HttpClient;
}): HomeRepository {
  return {
    /**
     * 获取示例 Todo。
     *
     * @returns 示例 Todo 数据
     */
    async getSampleTodo(): Promise<Todo> {
      const response = await deps.httpClient.requestJson<Todo>({
        url: "https://jsonplaceholder.typicode.com/todos/1",
        method: "GET",
      });
      return response.data;
    },
  };
}
