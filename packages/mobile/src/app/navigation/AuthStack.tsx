import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { LoginScreen } from "@features/auth/ui/LoginScreen";
import { VerifyCodeScreen } from "@features/auth/ui/VerifyCodeScreen";

import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Auth 导航栈（未登录时展示）。
 *
 * @returns React 元素
 */
export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="VerifyCode">
        {({ route }) => <VerifyCodeScreen contact={route.params.contact} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
