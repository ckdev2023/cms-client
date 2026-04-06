import React from "react";
import {
  BodyText,
  Center,
  ErrorText,
  Loading,
  Screen,
  TitleText,
} from "@shared/ui";

import { useHomeViewModel } from "../model/useHomeViewModel";

/**
 * Home 页面（UI 层）。
 *
 * 约束：
 * - 页面不直接发请求、不直接处理复杂业务逻辑
 * - 只根据 model 层输出的 state 做纯渲染
 *
 * @returns React 元素
 */
export function HomeScreen() {
  const { state } = useHomeViewModel();

  if (state.status === "loading" || state.status === "idle") {
    return (
      <Center>
        <Loading />
      </Center>
    );
  }

  if (state.status === "error") {
    return (
      <Center padding="$4">
        <ErrorText testID="error">{state.error.code}</ErrorText>
      </Center>
    );
  }

  return (
    <Screen>
      <TitleText>Sample Todo</TitleText>
      <BodyText testID="todo-title">{state.todo.title}</BodyText>
    </Screen>
  );
}
