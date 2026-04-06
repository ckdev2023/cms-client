import React, { useMemo } from "react";

import { AppContainerProvider as Provider } from "../container/AppContainerContext";
import { createAppContainer } from "../container/createAppContainer";

/**
 * 应用级容器 Provider（带默认容器创建）。
 *
 * 用途：
 * - 在应用启动时创建一次容器（useMemo 确保稳定引用）
 * - 将容器注入到 React Context，供 Hook/Feature 读取依赖
 *
 * @param props 组件参数
 * @param props.children 子元素
 * @returns React 元素
 */
export function AppContainerProvider(props: { children: React.ReactNode }) {
  const container = useMemo(() => createAppContainer(), []);
  return <Provider value={container}>{props.children}</Provider>;
}
