import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Text } from "tamagui";

import { HomeScreen } from "@features/home/ui/HomeScreen";
import { ProfileScreen } from "@features/profile/ui/ProfileScreen";

import { CasesStack } from "./CasesStack";
import { InboxStack } from "./InboxStack";
import { TodosStack } from "./TodosStack";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Tab アイコン用ヘルパー。
 *
 * @param emoji 表示する emoji
 * @returns タブアイコンコンポーネント
 */
function tabIcon(emoji: string) {
  return function TabIcon() {
    return <Text fontSize="$5">{emoji}</Text>;
  };
}

/**
 * Main Tab Navigator（已登录时展示）。
 *
 * @returns React 元素
 */
export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: "ホーム", tabBarIcon: tabIcon("🏠") }}
      />
      <Tab.Screen
        name="CasesTab"
        component={CasesStack}
        options={{ title: "案件", tabBarIcon: tabIcon("📋") }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxStack}
        options={{ title: "メッセージ", tabBarIcon: tabIcon("💬") }}
      />
      <Tab.Screen
        name="TodosTab"
        component={TodosStack}
        options={{ title: "書類", tabBarIcon: tabIcon("📄") }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: "設定", tabBarIcon: tabIcon("👤") }}
      />
    </Tab.Navigator>
  );
}
