import type { Todo } from "./Todo";

/**
 * Home 领域仓库接口。
 *
 * 约束：
 * - domain 层仅定义接口/类型
 * - data 层提供实现，app 容器负责装配注入
 */
export type HomeRepository = {
  /**
   * 获取示例 Todo（演示用）。
   *
   * @returns Todo 实体
   */
  getSampleTodo(): Promise<Todo>;
};
