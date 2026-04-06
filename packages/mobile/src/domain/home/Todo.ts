/**
 * Todo 实体。
 *
 * 说明：
 * - domain 层仅承载纯 TypeScript 类型，不依赖任何运行时实现
 */
export type Todo = {
  /**
   * Todo 唯一标识。
   */
  id: number;
  /**
   * Todo 标题。
   */
  title: string;
  /**
   * 是否已完成。
   */
  completed: boolean;
};
