import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { DocumentListScreen } from "@features/documents/ui/DocumentListScreen";
import { DocumentUploadScreen } from "@features/documents/ui/DocumentUploadScreen";

import type { TodosStackParamList } from "./types";

const Stack = createNativeStackNavigator<TodosStackParamList>();

/**
 * Todos(Documents) 内嵌导航栈。
 *
 * @returns React 元素
 */
export function TodosStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="DocumentList" options={{ title: "書類" }}>
        {({ navigation }) => (
          <DocumentListScreen
            onUpload={() => navigation.navigate("DocumentUpload")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="DocumentUpload" options={{ title: "アップロード" }}>
        {({ navigation }) => (
          <DocumentUploadScreen onComplete={() => navigation.goBack()} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
