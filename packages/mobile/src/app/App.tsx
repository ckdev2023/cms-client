import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider, Theme } from "tamagui";

import { AppContainerProvider } from "./providers/AppContainerProvider";
import { RootNavigator } from "./navigation/RootNavigator";

import tamaguiConfig from "../../tamagui.config";

/**
 * 应用根组件。
 *
 * 负责：
 * - 注入 SafeArea 上下文
 * - 注入 Tamagui 主题与配置（供 shared/ui 与页面组件使用）
 * - 注入应用容器（依赖注入）
 * - 挂载导航容器与根路由
 *
 * @returns React 元素
 */
export function App() {
  return (
    <SafeAreaProvider>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <Theme name="light">
          <AppContainerProvider>
            <NavigationContainer>
              <RootNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </AppContainerProvider>
        </Theme>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}
