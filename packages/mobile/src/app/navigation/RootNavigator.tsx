import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Center, Loading } from "@shared/ui";

import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";
import { useAuthToken } from "./useAuthToken";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * 根导航栈。
 *
 * 该层只负责“页面编排”，不放业务逻辑：
 * - 根据 token 存在与否切换 Auth Stack / Main Tabs
 * - 具体业务数据获取/状态由 feature 的 model 层负责
 *
 * @returns React 元素
 */
export function RootNavigator() {
  const { hasToken, checking } = useAuthToken();

  if (checking) {
    return (
      <Center>
        <Loading />
      </Center>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {hasToken ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
