import React, { createContext, useContext } from "react";

import type { AppContainer } from "./AppContainer";

const Context = createContext<AppContainer | null>(null);

/**
 * 应用容器 Provider（依赖注入入口）。
 *
 * 用途：
 * - 统一向下提供 HttpClient/Logger/Repository 等依赖
 * - 避免页面/组件直接 new 依赖导致难测试与强耦合
 *
 * @param props 组件参数
 * @param props.value 容器实例
 * @param props.children 子元素
 * @returns React 元素
 */
export function AppContainerProvider(props: {
  value: AppContainer;
  children: React.ReactNode;
}) {
  return (
    <Context.Provider value={props.value}>{props.children}</Context.Provider>
  );
}

/**
 * 获取应用容器（依赖集合）。
 *
 * 约束：
 * - 若未注入容器则抛错，避免静默失败
 *
 * @returns 应用容器实例
 */
export function useAppContainer(): AppContainer {
  const value = useContext(Context);
  if (value == null) {
    throw new Error("AppContainer is not provided");
  }
  return value;
}
